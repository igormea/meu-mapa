# Prepara o build pra Play Store: versão (código crescente + nome = APPV) e assinatura do pacote AAB com a chave fixa do projeto
import os,re
p='android/app/build.gradle';g=open(p).read()
appv=re.search(r"APPV='([^']+)'",open('../js/util.js').read()).group(1)
code=int(os.environ.get('VCODE','1'))
g=re.sub(r'versionCode\s+\d+',f'versionCode {code}',g)
g=re.sub(r'versionName\s+"[^"]*"',f'versionName "{appv}"',g)
if 'signingConfigs' not in g:
    g=g.replace('    buildTypes {','''    signingConfigs {
        release {
            storeFile file("../../meumapa.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }
    }
    buildTypes {''',1)
    g=re.sub(r'(buildTypes\s*\{\s*release\s*\{)',r'\1\n            signingConfig signingConfigs.release',g,1)
open(p,'w').write(g)
print('versão',appv,'código',code)
