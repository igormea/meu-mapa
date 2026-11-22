# Gera todos os ícones do Ranvus Maps a partir do herói 3D (tools/icon_src/hero_cheer.png)
import math,random
from PIL import Image,ImageDraw,ImageFilter,ImageFont,ImageChops
S=2048
def radial(c1,c2,cx=.5,cy=.42,r=.85):
    im=Image.new('RGB',(S,S));px=im.load()
    g=Image.radial_gradient('L').resize((S,S))
    # gradiente: centro c1 -> borda c2
    a=Image.new('RGB',(S,S),c1);b=Image.new('RGB',(S,S),c2)
    m=g.transform((S,S),Image.AFFINE,(1/r,0,-(cx*S)/r+128*0+ (S/2)*(1/r) - S/2*(1/r)+0,0,1/r,0),resample=Image.BILINEAR) if False else g
    m=m.resize((int(S*r*1.4),int(S*r*1.4)));big=Image.new('L',(S,S),255);big.paste(m,(int(cx*S-m.width/2),int(cy*S-m.height/2)))
    return Image.composite(b,a,big)
def pin_path(cx,cy,R):
    # gota de GPS: círculo raio R no topo e ponta embaixo
    pts=[]
    tip=(cx,cy+R*2.15)
    ang0=math.degrees(math.asin(R/(R*2.15-0)))  # tangente aproximada
    for a in range(int(-90-(90-ang0)),int(270+(90-ang0))+1,2):
        t=math.radians(a);pts.append((cx+R*math.cos(t),cy+R*math.sin(t)))
    # ordena: arco por cima, depois ponta
    arc=[p for p in pts]
    return arc+[tip]
def pin_poly(cx,cy,R):
    pts=[];tipy=cy+R*2.2;d=tipy-cy;phi=math.asin(R/d)  # ângulo da tangente
    a0=math.pi/2+ (math.pi/2-phi)
    # do ponto tangente esquerdo, por cima, até o direito
    start=math.pi/2+phi*0+ (math.pi/2-phi)  
    tl=math.pi-(math.pi/2-phi)  # ângulo do ponto de tangência à esquerda (sentido horário a partir do leste, y pra baixo)
    angs=[math.radians(x) for x in range(0,361,2)]
    # pontos de tangência
    ta=math.pi/2-(math.pi/2-phi)  # direita-baixo
    pts=[]
    a=math.pi/2+ (math.pi/2-phi)
    # percorre de a (esquerda-baixo) passando por cima até (direita-baixo)
    end=math.pi/2-(math.pi/2-phi)+2*math.pi
    x=a
    while x<=end:
        pts.append((cx+R*math.cos(x),cy+R*math.sin(x)));x+=math.radians(1.5)
    pts.append((cx,tipy))
    return pts
def mask_from(poly):
    m=Image.new('L',(S,S),0);ImageDraw.Draw(m).polygon(poly,fill=255);return m
def shadow(mask,off=(0,40),blur=60,alpha=150):
    sh=Image.new('L',(S,S),0);sh.paste(mask,off);sh=sh.filter(ImageFilter.GaussianBlur(blur));return sh.point(lambda v:v*alpha//255)
def paste_col(base,mask,col):
    base.paste(Image.new('RGB',(S,S),col),(0,0),mask)
def glossy_pin(base,cx,cy,R,c_top=(255,92,72),c_bot=(176,24,24),rim=(240,196,92)):
    poly=pin_poly(cx,cy,R);m=mask_from(poly)
    base.paste((0,0,0),(0,0),shadow(m,(0,int(R*.12)),int(R*.18),170))
    # aro dourado: pino um pouco maior
    rimp=pin_poly(cx,cy,R*1.09);rm=mask_from([(x,y+R*0.0) for x,y in rimp])
    g=Image.linear_gradient('L').resize((S,S))
    gold=Image.composite(Image.new('RGB',(S,S),(255,226,140)),Image.new('RGB',(S,S),(150,96,20)),g.point(lambda v:255-v))
    base.paste(gold,(0,0),rm)
    body=Image.composite(Image.new('RGB',(S,S),c_bot),Image.new('RGB',(S,S),c_top),g.transform((S,S),Image.AFFINE,(1,0,0,0,S/(R*3.4),-(cy-R*1.1)*S/(R*3.4)),resample=Image.BILINEAR))
    base.paste(body,(0,0),m)
    # brilho
    hl=Image.new('L',(S,S),0);ImageDraw.Draw(hl).ellipse((cx-R*.7,cy-R*.88,cx+R*.15,cy-R*.25),fill=110);hl=hl.filter(ImageFilter.GaussianBlur(R*.12))
    hl=ImageChops.multiply(hl,m);base.paste((255,255,255),(0,0),hl)
    return m
def stars(base,n=140,seed=3,area=None):
    random.seed(seed);d=ImageDraw.Draw(base)
    for _ in range(n):
        x,y=random.random()*S,random.random()*S*.7;r=random.choice([2,2,3,4,6]);a=random.randint(90,230)
        d.ellipse((x-r,y-r,x+r,y+r),fill=(255,244,214) if r>4 else (200,210,255))
def map_lines(base,col,seed=7,w=6):
    random.seed(seed);d=ImageDraw.Draw(base)
    for i in range(14):
        y=random.randint(0,S);d.line([(0,y),(S,y+random.randint(-400,400))],fill=col,width=w)
        x=random.randint(0,S);d.line([(x,0),(x+random.randint(-400,400),S)],fill=col,width=w)
def dotted_path(base,pts,col,r=16,gap=70):
    d=ImageDraw.Draw(base)
    for (x1,y1),(x2,y2) in zip(pts,pts[1:]):
        L=math.hypot(x2-x1,y2-y1);n=int(L/gap)
        for k in range(n):
            t=k/n;x=x1+(x2-x1)*t;y=y1+(y2-y1)*t;d.ellipse((x-r,y-r,x+r,y+r),fill=col)
def bezier(p0,p1,p2,p3,n=40):
    return[(((1-t)**3)*p0[0]+3*((1-t)**2)*t*p1[0]+3*(1-t)*t*t*p2[0]+t**3*p3[0],((1-t)**3)*p0[1]+3*((1-t)**2)*t*p1[1]+3*(1-t)*t*t*p2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]
def frame(base,col_out=(201,150,42),col_in=(255,224,140)):
    rr=int(S*.22)
    m=Image.new('L',(S,S),0);ImageDraw.Draw(m).rounded_rectangle((0,0,S-1,S-1),rr,fill=255)
    d=ImageDraw.Draw(base);d.rounded_rectangle((26,26,S-27,S-27),rr-20,outline=col_out,width=44);d.rounded_rectangle((70,70,S-71,S-71),rr-60,outline=col_in,width=10)
    out=Image.new('RGBA',(S,S),(0,0,0,0));out.paste(base,(0,0),m);return out
def hero(name,h):
    im=Image.open(f'tools/icon_src/{name}.png').convert('RGBA');im=im.crop(im.getbbox());s=h/im.height;return im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
def put(base,im,cx,by,shadow_r=None):
    if shadow_r:
        sh=Image.new('L',(S,S),0);ImageDraw.Draw(sh).ellipse((cx-shadow_r,by-shadow_r*.22,cx+shadow_r,by+shadow_r*.22),fill=150);sh=sh.filter(ImageFilter.GaussianBlur(30));base.paste((0,0,0),(0,0),sh)
    base.paste(im,(int(cx-im.width/2),int(by-im.height)),im)
def glow(base,cx,cy,r,col,a=170):
    g=Image.new('L',(S,S),0);ImageDraw.Draw(g).ellipse((cx-r,cy-r,cx+r,cy+r),fill=a);g=g.filter(ImageFilter.GaussianBlur(r*.45));base.paste(col,(0,0),g)
def save(img,name):
    img.resize((1024,1024),Image.LANCZOS).save(f'/tmp/icon/{name}.png')


# ═════ ÍCONE OFICIAL (conceito 1: herói no pino, noite com mapa) ═════
def background():
    b=radial((44,58,120),(10,14,34));map_lines(b,(30,40,78),w=7);stars(b,120)
    dotted_path(b,bezier((-50,1700),(500,1500),(500,1950),(1024,1690)),(232,190,90),r=15)
    glow(b,1024,900,620,(120,80,200),120);return b
def foreground(base):
    glossy_pin(base,1024,820,430);put(base,hero('hero_cheer',1080),1024,1640,330);return base
def out(img,path,size):img.resize((size,size),Image.LANCZOS).save(path,optimize=True)
full=foreground(background())                       # quadrado cheio (Play Store e ícone recortável)
framed=frame(full.copy())                           # com moldura e cantos arredondados (site)
out(framed,'icon-192.png',192);out(framed,'icon-512.png',512)
out(full.convert('RGB'),'store/icon-play-512.png',512)
# maskable (o Android/Chrome recorta em círculo): conteúdo encolhido pra zona segura
mk=background();fg=foreground(Image.new('RGBA',(S,S),(0,0,0,0)))
fgs=fg.resize((int(S*.78),int(S*.78)),Image.LANCZOS);mk.paste(fgs,((S-fgs.width)//2,(S-fgs.height)//2+40),fgs)
out(mk,'icon-maskable-512.png',512)
# ícone adaptável do Android: frente (pino+herói) dentro da zona segura de 66% e fundo separado
fga=fg.resize((int(S*.62),int(S*.62)),Image.LANCZOS);F=Image.new('RGBA',(S,S),(0,0,0,0));F.paste(fga,((S-fga.width)//2,(S-fga.height)//2+30),fga)
out(F,'app/assets/icon-foreground.png',1024);out(background(),'app/assets/icon-background.png',1024);out(full,'app/assets/icon-only.png',1024)
# abertura (splash): fundo noturno + ícone no centro
sp=Image.new('RGB',(2732,2732),(14,26,52));ic=framed.resize((900,900),Image.LANCZOS);sp.paste(ic,(916,840),ic)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',150);ImageDraw.Draw(sp).text((1366,1900),'Ranvus Maps',font=f,anchor='mm',fill=(241,211,138))
sp.save('app/assets/splash.png',optimize=True);sp.save('app/assets/splash-dark.png',optimize=True)
print('ok')
