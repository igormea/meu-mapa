package io.github.igormea.ranvuscar;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;

import androidx.car.app.model.CarIcon;
import androidx.car.app.navigation.model.Maneuver;
import androidx.core.graphics.drawable.IconCompat;

/** Converte a manobra do app (tipo + direção, como no OSRM) no tipo do Android Auto e desenha a seta. */
final class ManeuverIcons {
    private ManeuverIcons() {}

    static Maneuver build(String type, String mod, int exit) {
        int t = type(type, mod);
        Maneuver.Builder b = new Maneuver.Builder(t).setIcon(icon(type, mod));
        if (t == Maneuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW) b.setRoundaboutExitNumber(Math.max(1, exit));
        return b.build();
    }

    static int type(String type, String mod) {
        if (type == null) type = ""; if (mod == null) mod = "";
        switch (type) {
            case "arrive": return Maneuver.TYPE_DESTINATION;
            case "depart": return Maneuver.TYPE_DEPART;
            case "roundabout": case "rotary": case "exit roundabout": case "exit rotary": case "roundabout turn":
                return Maneuver.TYPE_ROUNDABOUT_ENTER_AND_EXIT_CCW;   // Brasil: rotatória no sentido anti-horário
            case "fork": return mod.contains("left") ? Maneuver.TYPE_FORK_LEFT : Maneuver.TYPE_FORK_RIGHT;
            case "on ramp": return mod.contains("left") ? Maneuver.TYPE_ON_RAMP_NORMAL_LEFT : Maneuver.TYPE_ON_RAMP_NORMAL_RIGHT;
            case "off ramp": return mod.contains("left") ? Maneuver.TYPE_OFF_RAMP_NORMAL_LEFT : Maneuver.TYPE_OFF_RAMP_NORMAL_RIGHT;
            case "merge": return mod.contains("left") ? Maneuver.TYPE_MERGE_LEFT : mod.contains("right") ? Maneuver.TYPE_MERGE_RIGHT : Maneuver.TYPE_MERGE_SIDE_UNSPECIFIED;
        }
        switch (mod) {
            case "left": return Maneuver.TYPE_TURN_NORMAL_LEFT;
            case "right": return Maneuver.TYPE_TURN_NORMAL_RIGHT;
            case "slight left": return Maneuver.TYPE_TURN_SLIGHT_LEFT;
            case "slight right": return Maneuver.TYPE_TURN_SLIGHT_RIGHT;
            case "sharp left": return Maneuver.TYPE_TURN_SHARP_LEFT;
            case "sharp right": return Maneuver.TYPE_TURN_SHARP_RIGHT;
            case "uturn": return Maneuver.TYPE_U_TURN_LEFT;
            default: return Maneuver.TYPE_STRAIGHT;
        }
    }

    /** Ângulo da seta (0 = em frente, negativo = esquerda). */
    private static float angle(String mod) {
        if (mod == null) return 0;
        switch (mod) {
            case "left": return -90; case "right": return 90;
            case "slight left": return -45; case "slight right": return 45;
            case "sharp left": return -135; case "sharp right": return 135;
            case "uturn": return 180; default: return 0;
        }
    }

    static CarIcon icon(String type, String mod) {
        int S = 128; Bitmap b = Bitmap.createBitmap(S, S, Bitmap.Config.ARGB_8888); Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG); p.setColor(Color.WHITE);
        Paint st = new Paint(Paint.ANTI_ALIAS_FLAG); st.setColor(Color.WHITE); st.setStyle(Paint.Style.STROKE); st.setStrokeWidth(14); st.setStrokeCap(Paint.Cap.ROUND); st.setStrokeJoin(Paint.Join.ROUND);
        if ("arrive".equals(type)) {                       // destino: pino
            Path pin = new Path(); pin.addCircle(64, 52, 30, Path.Direction.CW); pin.moveTo(38, 66); pin.lineTo(64, 118); pin.lineTo(90, 66); pin.close();
            c.drawPath(pin, p); Paint h = new Paint(Paint.ANTI_ALIAS_FLAG); h.setColor(Color.BLACK); c.drawCircle(64, 52, 12, h);
        } else if (type != null && (type.contains("roundabout") || type.contains("rotary"))) {   // rotatória
            st.setStrokeWidth(12); c.drawArc(new RectF(34, 30, 94, 90), 0, 360, false, st);
            c.drawLine(64, 120, 64, 90, st); drawHead(c, p, 94, 60, 90);
        } else {                                             // seta: sobe e vira pro lado da manobra
            float a = angle(mod);
            Path path = new Path(); path.moveTo(64, 118); path.lineTo(64, 70);
            double r = Math.toRadians(a); float ex = (float) (64 + 44 * Math.sin(r)), ey = (float) (70 - 44 * Math.cos(r));
            if (Math.abs(a) >= 170) { path.lineTo(64, 40); path.quadTo(64, 18, 42, 18); path.quadTo(20, 18, 20, 40); path.lineTo(20, 64); c.drawPath(path, st); drawHead(c, p, 20, 74, 180); }
            else { path.lineTo(ex, ey); c.drawPath(path, st); drawHead(c, p, ex, ey, a); }
        }
        return new CarIcon.Builder(IconCompat.createWithBitmap(b)).build();
    }

    private static void drawHead(Canvas c, Paint p, float x, float y, float deg) {
        c.save(); c.translate(x, y); c.rotate(deg);
        Path h = new Path(); h.moveTo(0, -24); h.lineTo(20, 4); h.lineTo(-20, 4); h.close(); c.drawPath(h, p);
        c.restore();
    }
}
