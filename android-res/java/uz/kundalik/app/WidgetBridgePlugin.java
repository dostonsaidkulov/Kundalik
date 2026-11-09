package uz.kundalik.app;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Ilova ma'lumotlarini bosh ekran vidjetiga uzatadi. */
@CapacitorPlugin(name = "KundalikWidget")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data", "");
        Context ctx = getContext();
        ctx.getSharedPreferences(KundalikWidget.PREFS, Context.MODE_PRIVATE).edit().putString("data", data).apply();
        KundalikWidget.updateAll(ctx);
        call.resolve();
    }
}
