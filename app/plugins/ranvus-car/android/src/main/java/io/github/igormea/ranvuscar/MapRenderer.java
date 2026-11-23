package io.github.igormea.ranvuscar;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.util.LruCache;
import android.view.Surface;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.SurfaceCallback;
import androidx.car.app.SurfaceContainer;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Desenha o mapa na tela do carro: mapa em "tiles" (CARTO, claro de dia / escuro à noite),
 * girado pra direção em que você anda (como no Waze), rota dourada, seta da posição,
 * velocidade e placa de limite. Só toca na tela do carro; o celular continua com o app normal.
 */
public class MapRenderer implements SurfaceCallback, CarState.Listener {
    private final CarContext ctx;
    private Surface surface;
    private int W, H;
    private Rect visible = new Rect(), stable = new Rect();
    private final HandlerThread thread = new HandlerThread("ranvus-car-map");
    private final Handler h;
    private final ExecutorService net = Executors.newFixedThreadPool(4);
    private final LruCache<String, Bitmap> tiles = new LruCache<>(90);
    private final Set<String> loading = Collections.synchronizedSet(new HashSet<>());
    private final Set<String> failed = Collections.synchronizedSet(new HashSet<>());
    // posição suavizada (desliza entre as atualizações do GPS)
    private double sLat = Double.NaN, sLon, sHdg, fLat, fLon, tLat, tLon;
    private long tAt;
    private float zoom = 16.5f;
    private boolean running = true;

    private final Paint pTile = new Paint(Paint.FILTER_BITMAP_FLAG);
    private final Paint pRoute = new Paint(Paint.ANTI_ALIAS_FLAG), pRouteBg = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint pFill = new Paint(Paint.ANTI_ALIAS_FLAG), pStroke = new Paint(Paint.ANTI_ALIAS_FLAG), pText = new Paint(Paint.ANTI_ALIAS_FLAG);

    public MapRenderer(CarContext ctx) {
        this.ctx = ctx;
        thread.start(); h = new Handler(thread.getLooper());
        pRoute.setStyle(Paint.Style.STROKE); pRoute.setStrokeCap(Paint.Cap.ROUND); pRoute.setStrokeJoin(Paint.Join.ROUND);
        pRouteBg.setStyle(Paint.Style.STROKE); pRouteBg.setStrokeCap(Paint.Cap.ROUND); pRouteBg.setStrokeJoin(Paint.Join.ROUND);
        pStroke.setStyle(Paint.Style.STROKE);
        pText.setTextAlign(Paint.Align.CENTER); pText.setFakeBoldText(true);
        CarState.listen(this);
        h.post(loop);
    }

    // ── superfície do carro ──
    @Override public void onSurfaceAvailable(@NonNull SurfaceContainer c) {
        surface = c.getSurface(); W = c.getWidth(); H = c.getHeight();
        if (visible.isEmpty()) visible.set(0, 0, W, H);
        requestDraw();
    }
    @Override public void onVisibleAreaChanged(@NonNull Rect r) { visible = new Rect(r); requestDraw(); }
    @Override public void onStableAreaChanged(@NonNull Rect r) { stable = new Rect(r); requestDraw(); }
    @Override public void onSurfaceDestroyed(@NonNull SurfaceContainer c) { surface = null; }

    @Override public void onCarState(boolean tpl) {
        double la = CarState.lat, lo = CarState.lon;
        if (Double.isNaN(la)) return;
        h.post(() -> {
            if (Double.isNaN(sLat)) { sLat = fLat = tLat = la; sLon = fLon = tLon = lo; sHdg = CarState.hdg; }
            else { fLat = sLat; fLon = sLon; tLat = la; tLon = lo; }
            tAt = SystemClock.uptimeMillis();
        });
        requestDraw();
    }

    public void stop() { running = false; CarState.unlisten(this); h.removeCallbacksAndMessages(null); thread.quitSafely(); net.shutdownNow(); }

    private volatile boolean dirty = true;
    private void requestDraw() { dirty = true; }

    // ~12 quadros por segundo andando; parado, só redesenha quando algo muda
    private final Runnable loop = new Runnable() {
        @Override public void run() {
            if (!running) return;
            boolean moving = CarState.spd > 0.6 || SystemClock.uptimeMillis() - tAt < 1200;
            if (dirty || moving) { dirty = false; try { draw(); } catch (Exception ignored) {} }
            h.postDelayed(this, moving ? 80 : 250);
        }
    };

    // ── projeção (Web Mercator) ──
    private static double wx(double lon, double z) { return (lon + 180) / 360 * 256 * Math.pow(2, z); }
    private static double wy(double lat, double z) {
        double s = Math.sin(Math.toRadians(lat));
        return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256 * Math.pow(2, z);
    }

    private void draw() {
        Surface sf = surface;
        if (sf == null || !sf.isValid() || W == 0) return;
        // posição suavizada
        if (!Double.isNaN(sLat)) {
            float k = Math.min(1f, (SystemClock.uptimeMillis() - tAt) / 1000f);
            sLat = fLat + (tLat - fLat) * k; sLon = fLon + (tLon - fLon) * k;
            double d = ((CarState.hdg - sHdg + 540) % 360) - 180; sHdg = (sHdg + d * 0.18 + 360) % 360;
        }
        // zoom pela velocidade (mais longe na estrada, mais perto na cidade)
        double kmh = CarState.spd * 3.6;
        float zt = kmh < 15 ? 17.2f : kmh < 50 ? 16.6f : kmh < 85 ? 15.8f : 15.0f;
        zoom += (zt - zoom) * 0.05f;

        boolean dark = ctx.isDarkMode();
        Canvas c = sf.lockHardwareCanvas();
        try {
            c.drawColor(dark ? Color.rgb(20, 24, 36) : Color.rgb(232, 230, 222));
            if (Double.isNaN(sLat)) { drawCenterText(c, "Abra o Ranvus Maps no celular", dark); return; }
            Rect v = visible.isEmpty() ? new Rect(0, 0, W, H) : visible;
            float ax = v.centerX(), ay = v.top + v.height() * (CarState.nav ? 0.70f : 0.55f);  // seu lugar na tela
            double z = zoom, cx = wx(sLon, z), cy = wy(sLat, z);
            c.save();
            c.translate(ax, ay);
            if (CarState.nav || CarState.spd > 1.5) c.rotate((float) -sHdg);           // direção pra cima andando
            drawTiles(c, z, cx, cy, dark);
            drawRoute(c, z, cx, cy, dark);
            c.restore();
            drawMe(c, ax, ay, CarState.nav || CarState.spd > 1.5 ? 0 : (float) sHdg);
            drawSpeed(c, v, dark);
            drawMsg(c, v, dark);
        } finally { sf.unlockCanvasAndPost(c); }
    }

    private void drawTiles(Canvas c, double z, double cx, double cy, boolean dark) {
        int tz = (int) Math.floor(z); double sc = Math.pow(2, z - tz);    // escala do tile de 256 px no zoom atual
        double tileW = 256 * sc, R = Math.hypot(W, H) * 0.75;
        double tcx = cx / sc, tcy = cy / sc;                                // centro em pixels do zoom inteiro
        int x0 = (int) Math.floor((tcx - R / sc) / 256), x1 = (int) Math.floor((tcx + R / sc) / 256);
        int y0 = (int) Math.floor((tcy - R / sc) / 256), y1 = (int) Math.floor((tcy + R / sc) / 256);
        int n = 1 << tz;
        for (int ty = y0; ty <= y1; ty++) for (int tx = x0; tx <= x1; tx++) {
            if (ty < 0 || ty >= n) continue;
            int wxi = ((tx % n) + n) % n;
            float left = (float) (tx * tileW - cx), top = (float) (ty * tileW - cy);
            Bitmap b = tile(tz, wxi, ty, dark);
            if (b == null) b = parent(tz, wxi, ty, dark, c, left, top, (float) tileW);   // enquanto carrega, usa o tile de um zoom acima
            if (b != null) c.drawBitmap(b, null, new RectF(left, top, left + (float) tileW + 1, top + (float) tileW + 1), pTile);
        }
    }

    private Bitmap parent(int z, int x, int y, boolean dark, Canvas c, float left, float top, float size) {
        if (z < 2) return null;
        Bitmap p = tiles.get(key(z - 1, x / 2, y / 2, dark));
        if (p == null) return null;
        int hw = p.getWidth() / 2;
        Rect src = new Rect((x % 2) * hw, (y % 2) * hw, (x % 2) * hw + hw, (y % 2) * hw + hw);
        c.drawBitmap(p, src, new RectF(left, top, left + size + 1, top + size + 1), pTile);
        return null;
    }

    private static String key(int z, int x, int y, boolean dark) { return (dark ? "d" : "l") + z + "/" + x + "/" + y; }

    private Bitmap tile(int z, int x, int y, boolean dark) {
        String k = key(z, x, y, dark);
        Bitmap b = tiles.get(k);
        if (b != null || loading.contains(k) || failed.contains(k)) return b;
        loading.add(k);
        net.execute(() -> {
            try {
                String style = dark ? "dark_all" : "rastertiles/voyager";
                String sub = "abcd".substring((x + y) % 4, (x + y) % 4 + 1);
                URL u = new URL("https://" + sub + ".basemaps.cartocdn.com/" + style + "/" + z + "/" + x + "/" + y + "@2x.png");
                HttpURLConnection con = (HttpURLConnection) u.openConnection();
                con.setRequestProperty("User-Agent", "RanvusMaps/1.0 (Android Auto; uso pessoal)");
                con.setConnectTimeout(8000); con.setReadTimeout(10000);
                try (InputStream in = con.getInputStream()) {
                    Bitmap bm = BitmapFactory.decodeStream(in);
                    if (bm != null) { tiles.put(k, bm); dirty = true; } else failed.add(k);
                }
            } catch (Exception e) { failed.add(k); h.postDelayed(() -> failed.remove(k), 15000); }
            finally { loading.remove(k); }
        });
        return null;
    }

    private void drawRoute(Canvas c, double z, double cx, double cy, boolean dark) {
        double[] r = CarState.route;
        if (!CarState.nav || r.length < 4) return;
        Path p = new Path();
        for (int i = 0; i < r.length; i += 2) {
            float x = (float) (wx(r[i + 1], z) - cx), y = (float) (wy(r[i], z) - cy);
            if (i == 0) p.moveTo(x, y); else p.lineTo(x, y);
        }
        float wpx = Math.max(10, W / 70f);
        pRouteBg.setStrokeWidth(wpx * 1.6f); pRouteBg.setColor(dark ? Color.rgb(70, 40, 0) : Color.rgb(120, 70, 10));
        pRoute.setStrokeWidth(wpx); pRoute.setColor(Color.rgb(255, 196, 58));
        c.drawPath(p, pRouteBg); c.drawPath(p, pRoute);
    }

    /** Sua posição: seta dourada com borda escura (a mesma seta do app). */
    private void drawMe(Canvas c, float x, float y, float rot) {
        float s = Math.max(22, W / 34f);
        c.save(); c.translate(x, y); c.rotate(rot);
        pFill.setColor(Color.argb(70, 0, 0, 0)); c.drawCircle(0, s * 0.25f, s * 0.95f, pFill);
        Path a = new Path(); a.moveTo(0, -s); a.lineTo(s * 0.72f, s * 0.75f); a.lineTo(0, s * 0.38f); a.lineTo(-s * 0.72f, s * 0.75f); a.close();
        pFill.setColor(Color.rgb(255, 200, 58)); c.drawPath(a, pFill);
        pStroke.setColor(Color.rgb(58, 36, 0)); pStroke.setStrokeWidth(s * 0.12f); c.drawPath(a, pStroke);
        c.restore();
    }

    /** Velocímetro e placa de limite no canto de baixo, dentro da área livre. */
    private void drawSpeed(Canvas c, Rect v, boolean dark) {
        float r = Math.max(30, Math.min(W, H) / 13f), m = r * 0.35f;
        float x = v.left + m + r, y = v.bottom - m - r;
        int kmh = (int) Math.round(CarState.spd * 3.6), lim = CarState.limit;
        boolean over = lim > 0 && kmh > lim + 4;
        pFill.setColor(over ? Color.rgb(200, 40, 40) : (dark ? Color.rgb(16, 22, 44) : Color.WHITE)); c.drawCircle(x, y, r, pFill);
        pStroke.setColor(Color.rgb(201, 150, 42)); pStroke.setStrokeWidth(r * 0.12f); c.drawCircle(x, y, r, pStroke);
        pText.setColor(over || dark ? Color.WHITE : Color.rgb(16, 22, 44)); pText.setTextSize(r * 0.85f);
        c.drawText(String.valueOf(kmh), x, y + r * 0.22f, pText);
        pText.setTextSize(r * 0.3f); c.drawText("km/h", x, y + r * 0.62f, pText);
        if (lim > 0) {
            float lx = x + r * 2.3f, lr = r * 0.78f;
            pFill.setColor(Color.WHITE); c.drawCircle(lx, y, lr, pFill);
            pStroke.setColor(Color.rgb(210, 30, 30)); pStroke.setStrokeWidth(lr * 0.2f); c.drawCircle(lx, y, lr * 0.9f, pStroke);
            pText.setColor(Color.BLACK); pText.setTextSize(lr * 0.85f); c.drawText(String.valueOf(lim), lx, y + lr * 0.3f, pText);
        }
    }

    /** Recado curto do jogo (ex.: "⚔️ Venceu o Slime +40 XP") por 4 s, no topo da área livre. */
    private void drawMsg(Canvas c, Rect v, boolean dark) {
        String msg = CarState.msg;
        if (msg == null || msg.isEmpty() || System.currentTimeMillis() - CarState.msgAt > 4000) return;
        float ts = Math.max(18, Math.min(W, H) / 26f);
        pText.setTextSize(ts);
        float w = pText.measureText(msg) + ts * 1.6f, x = v.centerX(), y = v.top + ts * 1.8f;
        pFill.setColor(Color.argb(230, 16, 22, 44));
        c.drawRoundRect(new RectF(x - w / 2, y - ts * 1.2f, x + w / 2, y + ts * 0.6f), ts, ts, pFill);
        pText.setColor(Color.rgb(241, 211, 138)); c.drawText(msg, x, y, pText);
    }

    private void drawCenterText(Canvas c, String t, boolean dark) {
        pText.setTextSize(Math.max(20, Math.min(W, H) / 20f)); pText.setColor(dark ? Color.WHITE : Color.DKGRAY);
        c.drawText(t, W / 2f, H / 2f, pText);
    }
}
