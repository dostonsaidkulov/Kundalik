"""CI qadami: Capacitor yaratgan Android loyihasiga vidjet va havolalarni qo'shadi."""
from pathlib import Path

m = Path('android/app/src/main/AndroidManifest.xml')
s = m.read_text()
deep_link = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="kundalik" />
            </intent-filter>
'''
anchor = '<category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n'
assert anchor in s, 'launcher intent-filter not found'
s = s.replace(anchor, anchor + deep_link, 1)
receiver = '''
        <receiver
            android:name="uz.kundalik.app.KundalikWidget"
            android:exported="false"
            android:label="Kundalik">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/kundalik_widget_info" />
        </receiver>
    </application>'''
assert '</application>' in s
s = s.replace('    </application>', receiver, 1)
if 'SCHEDULE_EXACT_ALARM' not in s:
    s = s.replace('<uses-permission android:name="android.permission.INTERNET" />',
                  '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />', 1)
m.write_text(s)
print('manifest patched')
