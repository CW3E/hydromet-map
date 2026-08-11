import pptxgen from 'pptxgenjs';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'CW3E / Hydromet Map';
pptx.subject = 'Interactive hydrometeorological mapping platform';
pptx.title = 'Interactive Hydrometeorological Mapping';
pptx.company = 'UC San Diego / CW3E';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Aptos Display', bodyFontFace: 'Aptos', lang: 'en-US'
};
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: 'F6F8F7' },
  objects: [
    { line: { x: 0.55, y: 0.42, w: 0.55, h: 0, line: { color: '2F6B5B', width: 4 } } },
    { text: { text: 'HYDROMET MAP', options: { x: 11.25, y: 0.25, w: 1.45, h: 0.25, fontFace: 'Aptos', fontSize: 9, bold: true, color: '58706A', align: 'right', margin: 0 } } },
    { text: { text: 'CW3E', options: { x: 0.6, y: 7.18, w: 0.6, h: 0.16, fontSize: 8, color: '71817D', margin: 0 } } },
  ],
  slideNumber: { x: 12.35, y: 7.12, w: 0.35, h: 0.2, color: '71817D', fontSize: 8, align: 'right' }
});

const C = { ink:'18312B', green:'2F6B5B', mint:'DCE9E3', blue:'DDEAF1', sand:'EFE4D5', coral:'E7B8A8', white:'FFFFFF', gray:'58706A', pale:'EEF2F0' };
const sourceRoot = 'C:\\Users\\m3pan\\Desktop\\projects\\hydromet-map';
const notes = (body, sources=[]) => `${body}\n\n[Sources]\n${sources.map(s=>'- '+sourceRoot+'\\'+s).join('\n')}`;
const addTitle = (s, title, kicker) => {
  if (kicker) s.addText(kicker.toUpperCase(), {x:0.62,y:0.63,w:4.3,h:0.24,fontSize:10,bold:true,charSpacing:1.8,color:C.green,margin:0});
  s.addText(title,{x:0.62,y:kicker?0.94:0.67,w:12.0,h:0.62,fontSize:29,bold:true,color:C.ink,margin:0,breakLine:false,fit:'shrink'});
};
const card = (s,x,y,w,h,title,body,fill=C.white,accent=C.green) => {
  s.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.08,fill:{color:fill},line:{color:'D5DEDA',width:0.8},shadow:{type:'outer',color:'9EABA7',blur:1,angle:45,distance:1,opacity:0.12}});
  s.addShape(pptx.ShapeType.rect,{x:x+0.18,y:y+0.2,w:0.08,h:0.4,fill:{color:accent},line:{color:accent}});
  s.addText(title,{x:x+0.38,y:y+0.2,w:w-0.58,h:0.36,fontSize:17,bold:true,color:C.ink,margin:0,fit:'shrink'});
  s.addText(body,{x:x+0.25,y:y+0.76,w:w-0.5,h:h-0.94,fontSize:13.5,color:C.gray,breakLine:false,margin:0.05,fit:'shrink',valign:'top',bullet:undefined,paraSpaceAfterPt:8});
};
const pill=(s,x,y,w,t,fill=C.mint)=>{s.addShape(pptx.ShapeType.roundRect,{x,y,w,h:0.38,rectRadius:0.08,fill:{color:fill},line:{color:fill}});s.addText(t,{x:x+0.08,y:y+0.075,w:w-0.16,h:0.18,fontSize:10.5,bold:true,color:C.ink,align:'center',margin:0,fit:'shrink'});};
const arrow=(s,x,y,w)=>s.addShape(pptx.ShapeType.chevron,{x,y,w,h:0.34,fill:{color:'92AAA3'},line:{color:'92AAA3'}});
const slide=()=>pptx.addSlide('MASTER');

// 1
{
 const s=slide();
 s.background={color:'163B33'};
 s.addShape(pptx.ShapeType.arc,{x:8.0,y:-0.35,w:5.8,h:5.8,adjustPoint:0.25,rotate:18,line:{color:'76A897',width:2,transparency:35},fill:{color:'163B33',transparency:100}});
 s.addShape(pptx.ShapeType.arc,{x:9.0,y:1.1,w:4.8,h:4.8,rotate:205,line:{color:'C8DDD5',width:1.2,transparency:40},fill:{color:'163B33',transparency:100}});
 s.addText('INTERACTIVE\nHYDROMETEOROLOGICAL\nMAPPING',{x:0.75,y:1.35,w:8.9,h:2.25,fontSize:33,bold:true,color:C.white,margin:0,breakLine:false,fit:'shrink'});
 s.addText('A reusable framework for exploring, analyzing, and sharing heterogeneous geospatial data',{x:0.8,y:4.15,w:7.1,h:0.85,fontSize:18,color:'D7E5E0',margin:0,fit:'shrink'});
 s.addText('Architecture • design philosophy • current capabilities',{x:0.8,y:5.38,w:6.6,h:0.3,fontSize:12,bold:true,charSpacing:1.2,color:'9BC1B4',margin:0});
 s.addNotes(notes('Opening: this is not one map for one dataset. It is a reusable application framework that preserves the scientific context of an interactive view.', ['README.md']));
}

// 2
{
 const s=slide(); addTitle(s,'The map is the analytical workspace','Thesis');
 s.addText('A static map answers “where?”\nAn interactive state answers “where, when, which product, and under what view?”',{x:0.75,y:1.75,w:6.0,h:1.55,fontSize:25,bold:true,color:C.ink,margin:0,breakLine:false,fit:'shrink'});
 const steps=[['EXPLORE','Change view and projection'],['SELECT','Choose data and parameters'],['INSPECT','Open profiles and time series'],['SHARE','Reproduce the same state']];
 steps.forEach((d,i)=>{const x=0.8+i*3.08; s.addShape(pptx.ShapeType.ellipse,{x,y:4.32,w:0.65,h:0.65,fill:{color:[C.green,'477D96','A8735D','6F7C45'][i]},line:{color:C.white,width:1}});s.addText(String(i+1),{x:x+0.12,y:4.48,w:0.4,h:0.2,fontSize:13,bold:true,color:C.white,align:'center',margin:0});s.addText(d[0],{x,y:5.15,w:2.7,h:0.3,fontSize:14,bold:true,color:C.ink,margin:0});s.addText(d[1],{x,y:5.52,w:2.55,h:0.55,fontSize:12.5,color:C.gray,margin:0,fit:'shrink'}); if(i<3) arrow(s,x+2.28,4.48,0.54);});
 s.addNotes(notes('Frame the application as a stateful analytical workspace. Each interaction contributes context that can later be bookmarked.', ['README.md','docs/architecture.md']));
}

// 3
{
 const s=slide(); addTitle(s,'Goal 1 — Make exploration genuinely interactive','Interaction');
 card(s,0.65,1.65,3.85,4.65,'Navigate the world','Location • zoom\nPitch • bearing\nMercator or globe\n3D terrain',C.white,C.green);
 card(s,4.73,1.65,3.85,4.65,'Compose the map','Flat • terrain • satellite\nOne or many layers\nLayer visibility and order\nFamily-specific controls',C.white,'477D96');
 card(s,8.81,1.65,3.85,4.65,'Choose the data slice','Date • product • variable\nEnsemble • aircraft • flight\nVertical exaggeration\nOther layer-specific dimensions',C.white,'A8735D');
 s.addNotes(notes('The UI exposes both camera state and domain-specific selectors. Layer-family controls keep related choices bundled with their data.', ['src/config/mapConfig.js','src/components/MapCanvas.jsx','src/components/controls']));
}

// 4
{
 const s=slide(); addTitle(s,'From a map feature to an explorable profile','Time series');
 const items=[['1','CLICK','A station, river, well, or dropsonde'],['2','OPEN','A linked profile or time-series popup'],['3','TUNE','Variables, tabs, x/y ranges, hover mode'],['4','READ','Exact values and coordinated traces']];
 items.forEach((d,i)=>{const x=0.72+i*3.12; s.addShape(pptx.ShapeType.roundRect,{x,y:2.0,w:2.72,h:2.9,rectRadius:0.08,fill:{color:i%2?C.blue:C.mint},line:{color:'C9D6D1'}});s.addText(d[0],{x:x+0.2,y:2.22,w:0.5,h:0.5,fontSize:23,bold:true,color:C.green,margin:0});s.addText(d[1],{x:x+0.2,y:2.93,w:2.15,h:0.3,fontSize:14,bold:true,color:C.ink,margin:0});s.addText(d[2],{x:x+0.2,y:3.47,w:2.18,h:0.9,fontSize:14,color:C.gray,margin:0,fit:'shrink'});if(i<3)arrow(s,x+2.77,3.28,0.33)});
 s.addText('The plot is not a separate application—it inherits the map selection and can be restored with the bookmark.',{x:1.15,y:5.6,w:11.0,h:0.55,fontSize:18,bold:true,color:C.ink,align:'center',margin:0,fit:'shrink'});
 s.addNotes(notes('Explain the click-to-popup pattern. Plotly provides hover, axis controls, trace toggles, and profile plots while the application owns identity and bookmark state.', ['src/components/popups','src/lib','docs/architecture.md']));
}

// 5
{
 const s=slide(); addTitle(s,'Goals 2–4 — Broaden the analytical surface','Capabilities');
 card(s,0.7,1.65,3.85,4.75,'Many data models','Raster overlays\nVector features\nRaster and vector tiles\nTime series and tables\nCustom 3D objects',C.white,C.green);
 card(s,4.75,1.65,3.85,4.75,'Reproducible sharing','Camera and projection\nVisible layers\nData-family selections\nPopup identity and tab\nStable bookmark URL',C.white,'477D96');
 card(s,8.8,1.65,3.85,4.75,'Basic hydrography','Identify contributing basin\nTrace upstream/downstream\nInspect river networks\nOverlay or export results',C.white,'A8735D');
 s.addNotes(notes('These are separate goals but share one architectural requirement: state must be explicit, composable, and tied to stable layer identities.', ['README.md','docs/bookmarks.md','src/lib/hydro']));
}

// 6
{
 const s=slide(); addTitle(s,'Reusable configuration: layer → family → project','Core model');
 const defs=[['LAYER','How one dataset renders and behaves','source • style • popup • legend'],['LAYER FAMILY','How related layers share controls','date • product • variable • linked layers'],['PROJECT','Which capabilities form an experience','extent • basemap • tools • defaults']];
 defs.forEach((d,i)=>{const x=0.75+i*4.17; s.addShape(pptx.ShapeType.roundRect,{x,y:1.75,w:3.45,h:3.95,rectRadius:0.08,fill:{color:[C.mint,C.blue,C.sand][i]},line:{color:'C5D2CD',width:1}});pill(s,x+0.35,2.1,1.35,d[0],C.white);s.addText(d[1],{x:x+0.35,y:2.9,w:2.75,h:0.9,fontSize:19,bold:true,color:C.ink,margin:0,fit:'shrink'});s.addText(d[2],{x:x+0.35,y:4.28,w:2.72,h:0.7,fontSize:13.5,color:C.gray,margin:0,fit:'shrink'});if(i<2)arrow(s,x+3.58,3.45,0.42)});
 s.addText('Reuse grows upward; implementation detail stays downward.',{x:2.5,y:6.2,w:8.3,h:0.45,fontSize:19,bold:true,color:C.green,align:'center',margin:0});
 s.addNotes(notes('A layer is the rendering unit. A layer family coordinates related layers and selectors. A project composes families, standalone layers, map defaults, and tools into a user-facing experience.', ['src/config/mapConfig.js','docs/architecture.md','.codex/skills/hydromet-map-config-workflow/SKILL.md']));
}

// 7
{
 const s=slide(); addTitle(s,'Runtime architecture keeps configuration separate from rendering','Architecture');
 const rows=[['PROJECT + BOOKMARK','Select configuration and restore visible state',C.sand],['APP STATE + REGISTRIES','Resolve projects, families, layers, popups, legends',C.blue],['MAP CANVAS + UI','Render MapLibre layers, Three.js objects, Plotly views',C.mint],['DATA SERVICES','GeoJSON • PMTiles • raster tiles • JSON/CSV • NetCDF-derived products',C.pale]];
 rows.forEach((d,i)=>{const y=1.45+i*1.28;s.addShape(pptx.ShapeType.roundRect,{x:1.2,y,w:10.95,h:0.87,rectRadius:0.06,fill:{color:d[2]},line:{color:'C9D5D1'}});s.addText(d[0],{x:1.48,y:y+0.19,w:2.55,h:0.25,fontSize:13,bold:true,color:C.ink,margin:0});s.addText(d[1],{x:4.1,y:y+0.15,w:7.55,h:0.38,fontSize:14,color:C.gray,margin:0,fit:'shrink'});if(i<3)s.addShape(pptx.ShapeType.downArrow,{x:6.43,y:y+0.87,w:0.38,h:0.35,fill:{color:'7E9B91'},line:{color:'7E9B91'}})});
 s.addNotes(notes('The key boundary is configuration versus runtime. Registries resolve stable IDs into rendering and popup modules. Data can be served as files or tiles without changing the project model.', ['src/config/mapConfig.js','src/components/MapCanvas.jsx','src/components/layers','src/components/popups','docs/architecture.md']));
}

// 8
{
 const s=slide(); addTitle(s,'A bookmark is a reproducible analytical state','Sharing');
 const state=['Camera','Projection','Basemap','Visible layers','Family selectors','Popup target','Popup tab/ranges'];
 state.forEach((t,i)=>pill(s,0.82+(i%4)*3.02,1.8+Math.floor(i/4)*0.75,2.55,t,[C.mint,C.blue,C.sand,C.pale][i%4]));
 s.addShape(pptx.ShapeType.downArrow,{x:6.15,y:3.36,w:0.55,h:0.55,fill:{color:C.green},line:{color:C.green}});
 s.addShape(pptx.ShapeType.roundRect,{x:2.35,y:4.05,w:8.65,h:1.35,rectRadius:0.08,fill:{color:'163B33'},line:{color:'163B33'}});
 s.addText('ONE SHAREABLE URL',{x:3.25,y:4.35,w:6.85,h:0.38,fontSize:24,bold:true,color:C.white,align:'center',margin:0});
 s.addText('“Open what I was looking at—not merely the application.”',{x:2.4,y:5.9,w:8.55,h:0.48,fontSize:19,italic:true,color:C.green,align:'center',margin:0});
 s.addNotes(notes('Bookmarks serialize active, user-visible state. This makes a view portable between collaborators and useful in reports, QA, and operational handoffs.', ['docs/bookmarks.md','src/lib/bookmarkState.js','src/config/mapConfig.js']));
}

// 9
{
 const s=slide(); addTitle(s,'Hydrography turns a click into network context','Hydro tools');
 const d=[['POINT','Select a location'],['BASIN','Identify contributing area'],['NETWORK','Trace flow paths'],['RESULT','Overlay, inspect, export']];
 d.forEach((v,i)=>{const x=0.75+i*3.13;s.addShape(pptx.ShapeType.ellipse,{x:x+0.7,y:1.75,w:1.15,h:1.15,fill:{color:[C.coral,C.sand,C.blue,C.mint][i]},line:{color:'A9BBB5',width:1}});s.addText(i===0?'●':i===1?'⌁':i===2?'⇢':'✓',{x:x+0.97,y:2.02,w:0.6,h:0.4,fontSize:22,bold:true,color:C.ink,align:'center',margin:0});s.addText(v[0],{x,y:3.25,w:2.55,h:0.3,fontSize:15,bold:true,color:C.ink,align:'center',margin:0});s.addText(v[1],{x,y:3.75,w:2.55,h:0.58,fontSize:14,color:C.gray,align:'center',margin:0,fit:'shrink'});if(i<3)arrow(s,x+2.5,2.15,0.6)});
 s.addText('The tool result becomes another map layer, so it participates in the same visibility and sharing model.',{x:1.5,y:5.3,w:10.35,h:0.75,fontSize:19,bold:true,color:C.ink,align:'center',margin:0,fit:'shrink'});
 s.addNotes(notes('Hydrography tools reuse the map’s core abstractions: user input, computed geometry, visible overlay, and explicit state.', ['src/lib/hydro','src/components/controls','src/components/MapCanvas.jsx']));
}

// 10
{
 const s=slide(); addTitle(s,'Design philosophy','Principles');
 const vals=[['CONFIGURATION-FIRST','Add capabilities through registries and reusable definitions.'],['PROGRESSIVE DISCLOSURE','Show controls only when their layer or family is active.'],['STABLE IDENTITY','Keep project, layer, and bookmark identifiers durable.'],['COMPOSABLE INTERACTION','Map, popup, legend, and tools share the same state model.']];
 vals.forEach((d,i)=>card(s,0.72+(i%2)*6.25,1.55+Math.floor(i/2)*2.35,5.88,1.9,d[0],d[1],i%2?C.blue:C.mint,i<2?C.green:'A8735D'));
 s.addNotes(notes('These principles keep specialized scientific behavior possible without turning each dataset into a one-off application.', ['AGENTS.md','docs/architecture.md','.codex/skills/hydromet-map-config-workflow/SKILL.md']));
}

// 11
{
 const s=slide(); addTitle(s,'Software stack','Implementation');
 card(s,0.7,1.62,3.86,4.9,'Interaction + UI','React 19\nVite 8\nReact Map GL\nDate and control components\nQR/share utilities',C.white,C.green);
 card(s,4.74,1.62,3.86,4.9,'Rendering + analysis','MapLibre GL JS 5\nThree.js\nPlotly\nGeoJSON and custom layers\n2D, terrain, globe, 3D',C.white,'477D96');
 card(s,8.78,1.62,3.86,4.9,'Data + delivery','PMTiles\nRaster tile/overlay services\nJSON and CSV\nPython NetCDF conversion\nStatic-web deployment',C.white,'A8735D');
 s.addNotes(notes('Keep this high-level: browser-native rendering, file/tile-based delivery, and preprocessing where scientific formats need conversion.', ['package.json','tools/README.md','tools/ar_recon']));
}

// 12
{
 const s=slide(); addTitle(s,'AI agents accelerate work when the workflow is explicit','Development');
 const d=[['INSPECT','Read nearby patterns, configs, docs, and current state.'],['IMPLEMENT','Make a small scoped change using existing abstractions.'],['VERIFY','Build, test bookmarks, and inspect map behavior.']];
 d.forEach((v,i)=>{const x=0.78+i*4.16;card(s,x,1.7,3.68,3.2,v[0],v[1],[C.mint,C.blue,C.sand][i],[C.green,'477D96','A8735D'][i]);if(i<2)arrow(s,x+3.78,3.1,0.3)});
 s.addShape(pptx.ShapeType.roundRect,{x:1.25,y:5.42,w:10.85,h:0.78,rectRadius:0.05,fill:{color:'163B33'},line:{color:'163B33'}});
 s.addText('PROJECT SKILL = repeatable instructions + known registries + validation checklist',{x:1.58,y:5.66,w:10.2,h:0.28,fontSize:15,bold:true,color:C.white,align:'center',margin:0,fit:'shrink'});
 s.addNotes(notes('The agent is most useful when project conventions are encoded. The hydromet-map skill routes work through the correct registries and requires build/bookmark checks.', ['AGENTS.md','.codex/skills/hydromet-map-config-workflow/SKILL.md']));
}

// 13
{
 const s=slide(); addTitle(s,'Current projects — 7 composed experiences','Inventory');
 card(s,0.72,1.58,3.86,4.95,'FORECAST + BASINS','CNRFC\nB120\nYampa','FFFFFF',C.green);
 card(s,4.74,1.58,3.86,4.95,'OBSERVATIONS + OPERATIONS','AR Recon\nCW3E Observations','FFFFFF','477D96');
 card(s,8.76,1.58,3.86,4.95,'APPLIED + GLOBAL','OCWD\nGlobal','FFFFFF','A8735D');
 s.addNotes(notes('Every current project is listed here. Projects choose their default extent, basemap, layer families, standalone layers, and enabled tools.', ['src/config/mapConfig.js']));
}

// 14
{
 const s=slide(); addTitle(s,'Current layer families — 4 coordinated control sets','Inventory');
 card(s,0.72,1.52,5.88,2.1,'AR Recon Flights','3D flight and dropsonde layers\nYear • flight • aircraft • sondes • vertical exaggeration',C.mint,C.green);
 card(s,6.75,1.52,5.88,2.1,'CNRFC Hydro','Raster + linked streamflow\nVariable • date • product • ensemble',C.blue,'477D96');
 card(s,0.72,4.02,5.88,2.1,'UCRB Hydro','Regional raster products\nVariable • date • product',C.sand,'A8735D');
 card(s,6.75,4.02,5.88,2.1,'Global Hydro','Global raster + linked GRADES-hydroDL\nVariable • date',C.pale,'6F7C45');
 s.addNotes(notes('A family is not just a folder: it defines selectors, linked-layer behavior, visibility, and bookmark fields.', ['src/config/mapConfig.js']));
}

// 15
{
 const s=slide(); addTitle(s,'Current layers — 3D, raster, regions, and observations','Layer inventory 1 of 2');
 card(s,0.68,1.45,3.0,5.3,'3D + RASTER','AR Recon 3D\nCNRFC Rasters\nUCRB Rasters\nGlobal Rasters',C.white,C.green);
 card(s,3.88,1.45,3.0,5.3,'REGIONS + BASINS','CNRFC Region\nUCRB Region\nYampa Region\nOCWD Property\nOCWD Prado Basin (566’)\nCNRFC Basins\nB120 Basins',C.white,'477D96');
 card(s,7.08,1.45,2.65,5.3,'POINTS + OBS','Yampa Points\nCNRFC Points\nCW3E Met Obs\nB120 Points\nSnow Courses\nSnow Pillows',C.white,'A8735D');
 card(s,9.93,1.45,2.72,5.3,'LOCAL THEMES','OCWD Monitoring Wells\nOCWD Wetlands\nCNRFC Streamflow',C.white,'6F7C45');
 s.addNotes(notes('This appendix lists the non-global-network layers and the custom 3D layer. Display names match the configuration.', ['src/config/mapConfig.js']));
}

// 16
{
 const s=slide(); addTitle(s,'Current layers — river networks and global hydrography','Layer inventory 2 of 2');
 card(s,0.72,1.55,3.84,4.95,'NWM NETWORKS','NWM Rivers (CNRFC)\nNWM Rivers (CONUS)\nNWM Rivers (UCRB)',C.white,C.green);
 card(s,4.75,1.55,3.84,4.95,'BASINS + CHANNELS','HUC Basins\nSWORD Reaches (v17b)\nMERIT Basins (v1.0)\nHydroRIVERS (v1.0)\nGRIT (v0.6)',C.white,'477D96');
 card(s,8.78,1.55,3.84,4.95,'GLOBAL DATASETS','GRADES-hydroDL (v2.0 static)\nGRADES-hydroDL (v2.0)\nCama-Flood (6min)\nGSHA (v1.1)\nGeoDAR (v1.1)',C.white,'A8735D');
 s.addNotes(notes('This completes the layer inventory: 33 layers total, including 14 vector-tile layers.', ['src/config/mapConfig.js']));
}

// 17
{
 const s=slide(); s.background={color:'163B33'};
 s.addText('ONE FRAMEWORK.\nMANY DATASETS.\nREPRODUCIBLE VIEWS.',{x:0.85,y:1.25,w:7.45,h:2.1,fontSize:34,bold:true,color:C.white,margin:0,fit:'shrink'});
 s.addText('Add a reusable layer → coordinate it as a family → compose it into a project → share the exact analytical state.',{x:0.9,y:4.05,w:7.25,h:1.0,fontSize:18,color:'D7E5E0',margin:0,fit:'shrink'});
 s.addShape(pptx.ShapeType.roundRect,{x:9.2,y:1.3,w:2.8,h:2.8,rectRadius:0.12,fill:{color:'DCE9E3'},line:{color:'DCE9E3'}});
 s.addText('EXPLORE\nINSPECT\nSHARE',{x:9.53,y:1.94,w:2.15,h:1.55,fontSize:23,bold:true,color:C.ink,align:'center',margin:0,breakLine:false});
 s.addText('Website demonstrations follow',{x:9.1,y:4.68,w:3.0,h:0.35,fontSize:13,bold:true,color:'9BC1B4',align:'center',margin:0});
 s.addNotes(notes('Transition to live website examples. Choose demonstrations that show different architectural strengths: family controls, time-series popup, 3D AR Recon, bookmarking, and a hydrography workflow.', ['README.md','src/config/mapConfig.js']));
}

for (const s of pptx._slides) {
  // Ensure the title master footer remains legible on dark slides.
}

await pptx.writeFile({ fileName: '../../artifacts/hydromet-map-overview.pptx' });
