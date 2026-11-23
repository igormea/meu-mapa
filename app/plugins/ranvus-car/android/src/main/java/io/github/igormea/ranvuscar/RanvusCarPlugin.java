package io.github.igormea.ranvuscar;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

/** Ponte app ⇄ Android Auto. O site chama RanvusCar.update(...) a cada posição; o carro avisa o site quando você escolhe um destino ou encerra. */
@CapacitorPlugin(name = "RanvusCar")
public class RanvusCarPlugin extends Plugin {
    static RanvusCarPlugin instance;

    @Override public void load() { instance = this; }

    /** Avisa o site (JS) de algo que aconteceu no carro. */
    static void emit(String ev, JSObject data) { if (instance != null) instance.notifyListeners(ev, data, true); }

    @PluginMethod
    public void update(PluginCall c) {
        JSObject p = c.getObject("pos");
        if (p != null) {
            CarState.lat = p.optDouble("lat", CarState.lat); CarState.lon = p.optDouble("lon", CarState.lon);
            CarState.hdg = p.optDouble("hdg", CarState.hdg); CarState.spd = p.optDouble("spd", 0);
        }
        boolean wasNav = CarState.nav, tpl = false;
        JSObject n = c.getObject("nav");
        if (n != null) {
            CarState.nav = n.optBoolean("active", false);
            String cue = n.optString("cue", ""), man = n.optString("type", "straight") + "|" + n.optString("mod", "");
            tpl = !cue.equals(CarState.cue) || !man.equals(CarState.maneuver + "|" + CarState.modifier);
            CarState.cue = cue; CarState.road = n.optString("road", "");
            CarState.maneuver = n.optString("type", "straight"); CarState.modifier = n.optString("mod", "");
            CarState.exit = n.optInt("exit", 0);
            CarState.stepDist = n.optDouble("dist", 0); CarState.remDist = n.optDouble("rem", 0); CarState.remSec = n.optDouble("remSec", 0);
            CarState.limit = n.optInt("limit", 0); CarState.progress = n.optDouble("prog", 0);
            CarState.destName = n.optString("dest", CarState.destName);
        }
        try {
            JSONArray r = c.getData().optJSONArray("route");
            if (r != null) {
                double[] a = new double[r.length() * 2];
                for (int i = 0; i < r.length(); i++) { JSONArray q = r.getJSONArray(i); a[i * 2] = q.getDouble(0); a[i * 2 + 1] = q.getDouble(1); }
                CarState.route = a; CarState.routeVersion++;
            }
        } catch (Exception ignored) {}
        JSObject h = c.getObject("hero");
        if (h != null) { CarState.heroCls = h.optString("cls", CarState.heroCls); CarState.heroLvl = h.optInt("lvl", CarState.heroLvl); }
        String msg = c.getString("msg");
        if (msg != null && !msg.isEmpty()) { CarState.msg = msg; CarState.msgAt = System.currentTimeMillis(); }
        if (wasNav != CarState.nav) tpl = true;
        CarState.changed(tpl);
        c.resolve();
    }

    /** Lista de destinos pra escolher no carro (Portais e recentes). */
    @PluginMethod
    public void setPlaces(PluginCall c) {
        try {
            JSArray a = c.getArray("places");
            synchronized (CarState.places) {
                CarState.places.clear();
                for (int i = 0; i < a.length() && i < 12; i++) {
                    JSONObject o = a.getJSONObject(i);
                    CarState.places.add(new CarState.Place(o.optString("name", "?"), o.optString("sub", ""), o.getDouble("lat"), o.getDouble("lon")));
                }
            }
        } catch (Exception ignored) {}
        c.resolve();
    }

    /** O site pergunta se o carro está conectado. */
    @PluginMethod
    public void status(PluginCall c) {
        JSObject o = new JSObject(); o.put("connected", RanvusSession.active); c.resolve(o);
    }
}
