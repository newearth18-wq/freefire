"""CPU triangle preview of the exported game meshes; not a browser screenshot."""
import json,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
panels=json.loads(Path(sys.argv[1]).read_text())
out=Path(sys.argv[2]); columns=3; w,h=480,800
if panels[0].get('weapon'): w,h=580,300
canvas=Image.new('RGB',(w*columns,h*((len(panels)+columns-1)//columns)),(14,28,41))
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
for panel_no,panel in enumerate(panels):
 a=np.array(panel['triangles'],dtype=float); p=a[:,:9].reshape(-1,3,3); c=a[:,9:].reshape(-1,3,3) if a.shape[1]==18 else a[:,9:12,None].transpose(0,2,1)
 # Interpolate normals welded by position, rather than showing every triangle flat.
 normals=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]); normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
 summed={}
 for face,ns in zip(p,normals):
  for v in face:
   k=tuple(np.round(v,4));summed[k]=summed.get(k,np.zeros(3))+ns
 vn=np.array([[summed[tuple(np.round(v,4))] for v in face] for face in p]);vn/=np.maximum(np.linalg.norm(vn,axis=2)[:,:,None],1e-12)
 light=np.array([-.5,.8,-.6]);light/=np.linalg.norm(light); lighting=.50+.50*np.maximum(0,vn@light)
 color=np.clip(c*lighting[:,:,None],0,1);color=np.where(color<=.0031308,color*12.92,1.055*color**(1/2.4)-.055)*255
 angle=.40 if not panel.get('weapon') else 1.15
 forward=np.array([np.sin(angle),.08,-np.cos(angle)]);forward/=np.linalg.norm(forward)
 right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 coords=np.stack([p@right,p@up,-p@forward],axis=2)
 minimum=coords.min(axis=(0,1));maximum=coords.max(axis=(0,1));scale=min((w-80)/(maximum[0]-minimum[0]),(h-120)/(maximum[1]-minimum[1]))
 coords[:,:,0]=(coords[:,:,0]-(minimum[0]+maximum[0])/2)*scale+w/2
 coords[:,:,1]=h-70-(coords[:,:,1]-minimum[1])*scale
 rgb=np.zeros((h,w,3),dtype=np.uint8);rgb[:]=[20,42,57];depth=np.full((h,w),np.inf)
 for face,shade in zip(coords,color):
  x0=max(0,int(np.floor(face[:,0].min())));x1=min(w-1,int(np.ceil(face[:,0].max())))
  y0=max(0,int(np.floor(face[:,1].min())));y1=min(h-1,int(np.ceil(face[:,1].max())))
  if x1<x0 or y1<y0:continue
  x,y=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
  a0,b0,c0=face;den=(b0[1]-c0[1])*(a0[0]-c0[0])+(c0[0]-b0[0])*(a0[1]-c0[1])
  if abs(den)<1e-9:continue
  u=((b0[1]-c0[1])*(x-c0[0])+(c0[0]-b0[0])*(y-c0[1]))/den
  v=((c0[1]-a0[1])*(x-c0[0])+(a0[0]-c0[0])*(y-c0[1]))/den;z=1-u-v
  d=u*a0[2]+v*b0[2]+z*c0[2];region=depth[y0:y1+1,x0:x1+1];visible=(u>=0)&(v>=0)&(z>=0)&(d<region)
  region[visible]=d[visible];pixels=rgb[y0:y1+1,x0:x1+1];colors=u[:,:,None]*shade[0]+v[:,:,None]*shade[1]+z[:,:,None]*shade[2];pixels[visible]=np.clip(colors[visible],0,255).astype(np.uint8)
 panel_image=Image.fromarray(rgb);draw=ImageDraw.Draw(panel_image);draw.text((24,18),panel['id'],font=font,fill=(232,240,248));canvas.paste(panel_image,((panel_no%columns)*w,(panel_no//columns)*h))
out.parent.mkdir(parents=True,exist_ok=True);canvas.save(out);print(out)
