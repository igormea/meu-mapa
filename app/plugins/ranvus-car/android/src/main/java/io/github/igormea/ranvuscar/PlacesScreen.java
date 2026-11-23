package io.github.igormea.ranvuscar;

import androidx.annotation.NonNull;
import androidx.car.app.CarContext;
import androidx.car.app.Screen;
import androidx.car.app.model.Action;
import androidx.car.app.model.ItemList;
import androidx.car.app.model.ListTemplate;
import androidx.car.app.model.Row;
import androidx.car.app.model.Template;

import com.getcapacitor.JSObject;

/** Escolher destino no carro: seus Portais e destinos recentes (salvos no app). Um toque e a rota começa. */
public class PlacesScreen extends Screen {
    public PlacesScreen(@NonNull CarContext ctx) { super(ctx); }

    @NonNull @Override public Template onGetTemplate() {
        ItemList.Builder list = new ItemList.Builder();
        synchronized (CarState.places) {
            for (CarState.Place p : CarState.places) {
                Row.Builder r = new Row.Builder().setTitle(p.name);
                if (!p.sub.isEmpty()) r.addText(p.sub);
                r.setOnClickListener(() -> {
                    JSObject o = new JSObject(); o.put("name", p.name); o.put("lat", p.lat); o.put("lon", p.lon);
                    RanvusCarPlugin.emit("carDestination", o);
                    getScreenManager().pop();
                });
                list.addItem(r.build());
            }
        }
        if (CarState.places.isEmpty()) list.setNoItemsMessage("Salve Portais no app do celular para escolher aqui");
        return new ListTemplate.Builder().setTitle("Para onde, aventureiro?").setHeaderAction(Action.BACK).setSingleList(list.build()).build();
    }
}
