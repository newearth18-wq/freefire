export const MAPS=[
 {id:'dawn',name:'เกาะอรุณ',radius:280,playRadius:260,seed:41,hills:4,grass:0x8eac72,sand:0xd9c495,leaf:0x3c7550,description:'หมู่บ้านและโกดัง กระจายทั่วเกาะ · กว้าง 560 ม.'},
 {id:'highland',name:'ที่ราบสูง',radius:340,playRadius:320,seed:83,hills:10,grass:0x789b73,sand:0xbfc4a7,leaf:0x335f54,description:'เนินสูง แนวป่า และชุมชนบนสันเขา · กว้าง 680 ม.'},
 {id:'desert',name:'หุบเขาทราย',radius:300,playRadius:280,seed:129,hills:6,grass:0xc2a86f,sand:0xe1c38e,leaf:0x76804b,description:'ชุมชนทะเลทราย โกดังใหญ่และที่กำบัง · กว้าง 600 ม.'}
];
export const mapInfo=id=>MAPS.find(m=>m.id===id)??MAPS[0];
export const validMap=id=>MAPS.some(m=>m.id===id);
