package io.github.igormea.ranvuscar;

import java.util.ArrayList;
import java.util.List;

/** O que o app (celular) manda pro carro. Atualizado pelo plugin, lido pela tela e pelo desenho do mapa. */
public final class CarState {
    private CarState() {}
    // posição
    public static volatile double lat = Double.NaN, lon = Double.NaN, hdg = 0, spd = 0; // spd em m/s
    // navegação
    public static volatile boolean nav = false;
    public static volatile String cue = "", road = "", maneuver = "straight", modifier = "", destName = "";
    public static volatile double stepDist = 0, remDist = 0, remSec = 0;
    public static volatile int limit = 0, exit = 0;
    public static volatile double[] route = new double[0];   // [lat,lon,lat,lon,...]
    public static volatile int routeVersion = 0;
    public static volatile double progress = 0;               // metros percorridos na rota
    // herói
    public static volatile String heroCls = "cavaleiro", msg = "";
    public static volatile int heroLvl = 1;
    public static volatile long msgAt = 0;
    // destinos salvos (Portais) e recentes
    public static final List<Place> places = new ArrayList<>();

    public static final class Place {
        public final String name, sub; public final double lat, lon;
        public Place(String n, String s, double la, double lo) { name = n; sub = s; lat = la; lon = lo; }
    }

    /** Quem desenha / mostra a tela do carro se registra aqui pra ser avisado de mudanças. */
    public interface Listener { void onCarState(boolean templateChanged); }
    private static final List<Listener> L = new ArrayList<>();
    public static synchronized void listen(Listener l) { if (!L.contains(l)) L.add(l); }
    public static synchronized void unlisten(Listener l) { L.remove(l); }
    public static void changed(boolean tpl) {
        List<Listener> c; synchronized (CarState.class) { c = new ArrayList<>(L); }
        for (Listener l : c) { try { l.onCarState(tpl); } catch (Exception ignored) {} }
    }
}
