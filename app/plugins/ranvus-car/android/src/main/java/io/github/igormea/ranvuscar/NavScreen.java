package io.github.igormea.ranvuscar;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ActionStrip;
import androidx.car.app.model.CarColor;
import androidx.car.app.model.DateTimeWithZone;
import androidx.car.app.model.Distance;
import androidx.car.app.model.Template;
import androidx.car.app.navigation.NavigationManager;
import androidx.car.app.navigation.NavigationManagerCallback;
import androidx.car.app.navigation.model.NavigationTemplate;
import androidx.car.app.navigation.model.RoutingInfo;
import androidx.car.app.navigation.model.Step;
import androidx.car.app.navigation.model.TravelEstimate;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.getcapacitor.JSObject;

import java.util.TimeZone;

/** Tela principal no carro: mapa + próxima manobra + chegada. Sem navegação: botão "Destinos". */
public class NavScreen extends Screen implements CarState.Listener {
    private final NavigationManager nm;
    private final Handler main = new Handler(Looper.getMainLooper());
    private boolean navStarted = false;
    private long lastInvalidate = 0;

    public NavScreen(@NonNull CarContext ctx) {
        super(ctx);
        nm = ctx.getCarService(NavigationManager.class);
        nm.setNavigationManagerCallback(new NavigationManagerCallback() {
            @Override public void onStopNavigation() { RanvusCarPlugin.emit("carStop", new JSObject()); }
        });
        CarState.listen(this);
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override public void onDestroy(@NonNull LifecycleOwner o) { CarState.unlisten(NavScreen.this); if (navStarted) nm.navigationEnded(); }
        });
    }

    /** A tela do carro só é atualizada quando a manobra muda ou a cada ~1 s (o Android Auto limita atualizações). */
    @Override public void onCarState(boolean tpl) {
        main.post(() -> {
            if (CarState.nav && !navStarted) { nm.navigationStarted(); navStarted = true; }
            else if (!CarState.nav && navStarted) { nm.navigationEnded(); navStarted = false; }
            long now = SystemClock.uptimeMillis();
            if (tpl || now - lastInvalidate > 1000) { lastInvalidate = now; invalidate(); }
        });
    }

    private static Distance dist(double m) {
        if (m < 1000) return Distance.create(Math.max(0, Math.round(m / 10.0) * 10), Distance.UNIT_METERS);
        return Distance.create(Math.round(m / 100.0) / 10.0, Distance.UNIT_KILOMETERS_P1);
    }

    @NonNull @Override public Template onGetTemplate() {
        NavigationTemplate.Builder b = new NavigationTemplate.Builder()
                .setBackgroundColor(CarColor.createCustom(0xFF141C36, 0xFF141C36));
        ActionStrip.Builder strip = new ActionStrip.Builder();
        if (CarState.nav) {
            strip.addAction(new Action.Builder().setTitle("Encerrar")
                    .setOnClickListener(() -> RanvusCarPlugin.emit("carStop", new JSObject())).build());
            String cue = CarState.cue.isEmpty() ? "Siga em frente" : CarState.cue;
            if (!CarState.road.isEmpty()) cue = cue + " · " + CarState.road;
            Step step = new Step.Builder(cue).setManeuver(ManeuverIcons.build(CarState.maneuver, CarState.modifier, CarState.exit)).build();
            b.setNavigationInfo(new RoutingInfo.Builder().setCurrentStep(step, dist(CarState.stepDist)).build());
            long arrive = System.currentTimeMillis() + (long) (CarState.remSec * 1000);
            b.setDestinationTravelEstimate(new TravelEstimate.Builder(dist(CarState.remDist),
                    DateTimeWithZone.create(arrive, TimeZone.getDefault()))
                    .setRemainingTimeSeconds((long) CarState.remSec).build());
        } else {
            strip.addAction(new Action.Builder().setTitle("Destinos")
                    .setOnClickListener(() -> getScreenManager().push(new PlacesScreen(getCarContext()))).build());
        }
        b.setActionStrip(strip.build());
        return b.build();
    }
}
