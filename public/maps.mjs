export const MAPS=[
 {id:'dawn',name:'เกาะอรุณ',radius:500,playRadius:475,seed:41,hills:4,grass:0x8eac72,sand:0xd9c495,leaf:0x3c7550,description:'เมืองสองชั้น ชุมชนชายฝั่ง และถนนขับรถ · กว้าง 1,000 ม.'},
 {id:'highland',name:'ที่ราบสูง',radius:600,playRadius:575,seed:83,hills:10,grass:0x789b73,sand:0xbfc4a7,leaf:0x335f54,description:'เนินเขา เมืองบนสันเขา และเส้นทางรถ · กว้าง 1,200 ม.'},
 {id:'desert',name:'หุบเขาทราย',radius:540,playRadius:515,seed:129,hills:6,grass:0xc2a86f,sand:0xe1c38e,leaf:0x76804b,description:'ชุมชนทะเลทราย บ้านสองชั้น และโกดัง · กว้าง 1,080 ม.'}
];
export const mapInfo=id=>MAPS.find(m=>m.id===id)??MAPS[0];
export const validMap=id=>MAPS.some(m=>m.id===id);
