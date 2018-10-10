let name1 = "Robi";
let name2 = "Dani";
let date = "2018. 10. 10"
let  hash = "0xfccf2af2aa0b01177d0d99997bdc22c711d4fbd83769946f9866750f466d2549";

var s = function( p ) {
	let imgHeart = p.loadImage("data/heart.png");
	let font = p.loadFont("data/Inconsolata-Regular.ttf");
	let imgOrigami = p.loadImage("data/origami.png");
	p.setup = function() {
		let c = p.createCanvas(1200,700);
		c.parent("Drawing");
		p.textFont(font);
	}
	p.draw = function() {
		p.background(240);
		p.fill(0,180);
		p.textSize(40);
		p.textAlign(p.RIGHT, p.CENTER);
		p.text(name1, p.width/2 - 60, p.height/4);
		p.textAlign(p.LEFT, p.CENTER);
		p.text(name2, p.width/2 + 60, p.height/4);
		p.imageMode(p.CENTER,p.CENTER);
		p.image(imgHeart,p.width/2,p.height/4,100,100);
		p.textAlign(p.CENTER, p.CENTER);
		p.textSize(20);
		p.text("Carved forever in the Blockchain since " + date + " at", p.width/2,p.height/3);
		p.textSize(30);
		p.text(hash, p.width/2,p.height/3 + 30);

		p.textSize(14);
		p.text("Print this page out & fold it according to the instructions below \n & give it to your love", p.width/2,p.height- p.height/2);
		p.image(imgOrigami,p.width/2,p.height-p.height/3, imgOrigami.width/3,imgOrigami.height/3);

	}
}
var myp5 = new p5(s);