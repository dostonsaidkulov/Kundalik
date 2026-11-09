package uz.kundalik.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/** Bosh ekran vidjeti: balans, bugungi vazifalar, kun nasihati va tez qo'shish tugmalari. */
public class KundalikWidget extends AppWidgetProvider {
    static final String PREFS = "kundalik_widget";
    private static final int[] TASK_IDS = { R.id.w_task1, R.id.w_task2, R.id.w_task3, R.id.w_task4 };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            render(context, manager, id);
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, KundalikWidget.class));
        for (int id : ids) {
            render(context, manager, id);
        }
    }

    private static PendingIntent link(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void render(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_kundalik);
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "");
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        try {
            JSONObject data = new JSONObject(raw == null || raw.isEmpty() ? "{}" : raw);
            v.setTextViewText(R.id.w_balance, data.optString("balance", "—"));
            v.setTextViewText(R.id.w_month, data.optString("month", ""));
            String inv = data.optString("inv", "");
            v.setTextViewText(R.id.w_inv, inv);
            v.setViewVisibility(R.id.w_inv, inv.isEmpty() ? View.GONE : View.VISIBLE);

            JSONObject days = data.optJSONObject("days");
            JSONObject day = days != null ? days.optJSONObject(today) : null;
            JSONArray tasks = day != null ? day.optJSONArray("tasks") : null;
            int count = tasks != null ? tasks.length() : 0;
            for (int i = 0; i < TASK_IDS.length; i++) {
                if (i < count) {
                    v.setTextViewText(TASK_IDS[i], "•  " + tasks.optString(i, ""));
                    v.setViewVisibility(TASK_IDS[i], View.VISIBLE);
                } else {
                    v.setViewVisibility(TASK_IDS[i], View.GONE);
                }
            }
            int more = day != null ? day.optInt("more", 0) : 0;
            if (count == 0) {
                v.setTextViewText(R.id.w_tasks_more, raw == null || raw.isEmpty() ? "Ilovani bir marta oching" : "Bugunga ochiq vazifa yo'q");
                v.setViewVisibility(R.id.w_tasks_more, View.VISIBLE);
            } else if (more > 0) {
                v.setTextViewText(R.id.w_tasks_more, "yana " + more + " ta");
                v.setViewVisibility(R.id.w_tasks_more, View.VISIBLE);
            } else {
                v.setViewVisibility(R.id.w_tasks_more, View.GONE);
            }
            String advice = day != null ? day.optString("advice", "") : "";
            v.setTextViewText(R.id.w_advice, advice);
            v.setViewVisibility(R.id.w_advice_box, advice.isEmpty() ? View.GONE : View.VISIBLE);
        } catch (Exception e) {
            v.setTextViewText(R.id.w_balance, "—");
        }

        v.setOnClickPendingIntent(R.id.w_top, link(context, "kundalik://open/money", 10));
        v.setOnClickPendingIntent(R.id.w_tasks_box, link(context, "kundalik://open/tasks", 11));
        v.setOnClickPendingIntent(R.id.w_advice_box, link(context, "kundalik://open/advice", 12));
        v.setOnClickPendingIntent(R.id.w_btn_expense, link(context, "kundalik://add/expense", 13));
        v.setOnClickPendingIntent(R.id.w_btn_task, link(context, "kundalik://add/task", 14));
        v.setOnClickPendingIntent(R.id.w_btn_idea, link(context, "kundalik://add/idea", 15));
        manager.updateAppWidget(widgetId, v);
    }
}
