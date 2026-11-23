package io.github.igormea.ranvuscar;

import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.car.app.AppManager;
import androidx.car.app.Screen;
import androidx.car.app.Session;
import androidx.lifecycle.DefaultLifecycleObserver;
import androidx.lifecycle.LifecycleOwner;

import com.getcapacitor.JSObject;

/** Uma conexão com o carro: liga o desenho do mapa e abre a tela de navegação. */
public class RanvusSession extends Session {
    static volatile boolean active = false;
    private MapRenderer renderer;

    @NonNull @Override public Screen onCreateScreen(@NonNull Intent intent) {
        renderer = new MapRenderer(getCarContext());
        getCarContext().getCarService(AppManager.class).setSurfaceCallback(renderer);
        active = true;
        RanvusCarPlugin.emit("carConnected", new JSObject());
        getLifecycle().addObserver(new DefaultLifecycleObserver() {
            @Override public void onDestroy(@NonNull LifecycleOwner o) {
                active = false;
                if (renderer != null) renderer.stop();
                RanvusCarPlugin.emit("carDisconnected", new JSObject());
            }
        });
        return new NavScreen(getCarContext());
    }
}
