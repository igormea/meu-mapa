# Adiciona as permissões de localização (inclusive em segundo plano) ao AndroidManifest
import re
p='android/app/src/main/AndroidManifest.xml'
m=open(p).read()
perms=['ACCESS_COARSE_LOCATION','ACCESS_FINE_LOCATION','FOREGROUND_SERVICE','FOREGROUND_SERVICE_LOCATION',
       'POST_NOTIFICATIONS','WAKE_LOCK','INTERNET']
add=''.join(f'    <uses-permission android:name="android.permission.{x}" />\n' for x in perms if f'permission.{x}"' not in m)
add+='    <uses-feature android:name="android.hardware.location.gps" android:required="false" />\n'
m=m.replace('</manifest>',add+'</manifest>')
# tela cheia em retrato
m=re.sub(r'(<activity\b)',r'\1 android:screenOrientation="portrait"',m,count=1)
open(p,'w').write(m)
print(m)
