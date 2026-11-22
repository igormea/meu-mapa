# Monta as imagens da ficha da Play Store a partir dos prints (/tmp/shots) e dos sprites das classes
from PIL import Image,ImageDraw,ImageFont,ImageFilter
SER='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf';SAN='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def bg(w,h):
    g=Image.radial_gradient('L').resize((w*2,h*2)).crop((w//2,h//3,w//2+w,h//3+h))
    return Image.composite(Image.new('RGB',(w,h),(10,14,34)),Image.new('RGB',(w,h),(48,60,124)),g)
def rounded(im,r):
    m=Image.new('L',im.size,0);ImageDraw.Draw(m).rounded_rectangle((0,0,im.width-1,im.height-1),r,fill=255);o=im.convert('RGBA');o.putalpha(m);return o
SH=[('s_route','Escolha o destino.','A aventura vem junto.'),('s_nav','Dirija normal:','seu herói luta sozinho.'),
    ('s_hero','Evolua sem tocar','na tela enquanto dirige.'),('s_best','139 monstros','pra caçar no Ceará.'),
    ('s_equip','Baú, poções e','lojas automáticas.'),('s_search','Busca rápida de','endereços, estilo Waze.'),('s_intro','5 classes.','Escolha a sua.')]
for i,(f,l1,l2) in enumerate(SH,1):
    c=bg(1080,1920);d=ImageDraw.Draw(c)
    d.text((540,120),l1,font=ImageFont.truetype(SER,74),anchor='mm',fill=(241,211,138))
    d.text((540,212),l2,font=ImageFont.truetype(SAN,54),anchor='mm',fill=(225,232,248))
    s=Image.open(f'/tmp/shots/{f}.png').convert('RGB');H=1560;W=int(s.width*H/s.height);s=s.resize((W,H),Image.LANCZOS)
    x=(1080-W)//2;y=300
    d.rounded_rectangle((x-10,y-10,x+W+10,y+H+10),56,fill=(201,150,42))
    c.paste(rounded(s,48),(x,y),rounded(s,48))
    c.save(f'store/screens/{i:02d}_{f[2:]}.png',optimize=True)
# banner de destaque 1024x500
fb=bg(1024,500);d=ImageDraw.Draw(fb)
for k in range(9):d.line([(0,k*62),(1024,k*62+90)],fill=(34,46,92),width=3)
for k in range(12):d.line([(k*96,0),(k*96-70,500)],fill=(34,46,92),width=3)
for x in range(40,1000,26):d.ellipse((x-5,410-5+int(18*__import__('math').sin(x/90)),x+5,410+5+int(18*__import__('math').sin(x/90))),fill=(240,193,90))
for k,(cls,fw) in enumerate([('mago',133),('arqueiro',98),('cavaleiro',114),('barbaro',114),('ladino',136)]):
    sp=Image.open(f'models/run/{cls}.webp').convert('RGBA').crop((fw*(k*3%8),0,fw*(k*3%8)+fw,160))
    sp=sp.resize((int(fw*1.05),168),Image.LANCZOS);px=470+k*96;py=408-168+int(18*__import__('math').sin(px/90))
    fb.paste(sp,(px,py),sp)
pin=Image.open('store/icon-play-512.png').convert('RGBA').resize((210,210),Image.LANCZOS)
fb.paste(rounded(pin,46),(60,60),rounded(pin,46))
d.text((300,120),'Ranvus Maps',font=ImageFont.truetype(SER,76),anchor='lm',fill=(241,211,138))
d.text((304,200),'Navegue. Evolua. Conquiste.',font=ImageFont.truetype(SAN,34),anchor='lm',fill=(225,232,248))
fb.save('store/feature-1024x500.png',optimize=True)
print('ok')
