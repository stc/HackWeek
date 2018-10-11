let name1 = "Alma";
let name2 = "Dinnye";
let date = "2018. 10. 10"
let  hash = "0xfccf2af2aa0b01177d0d99997bdc22c711d4fbd83769946f9866750f466d2549";

var s = function( p ) {
	let imgHeart = p.loadImage("data/heart.png");
	let imgSciss = p.loadImage("data/sciss.png");
	let font = p.loadFont("data/Inconsolata-Regular.ttf");
	let imgOrigami = p.loadImage("data/heartorig.png");
	let hash1 = hash.slice(0,hash.length/2);
	let hash2 = hash.slice(hash.length/2);
	
	p.setup = function() {
		let c = p.createCanvas(1050,1485);
		c.parent("Drawing");
		p.textFont(font);
	}
	p.draw = function() {
		p.background(240);
		p.noFill();
		p.push();
		p.stroke(0,200);
		p.translate(p.width/2,p.height/2);
		p.rotate(p.radians(45));
		p.translate(-p.width/2,-p.height/2);
		p.rectMode(p.CENTER);
		p.rect(p.width/2,p.height/2,650,650);
		p.pop();
		p.fill(0,180);
		p.textSize(40);
		p.textAlign(p.RIGHT, p.CENTER);
		p.text(name1, p.width/2 - 60, p.height/3);
		p.textAlign(p.LEFT, p.CENTER);
		p.text(name2, p.width/2 + 60, p.height/3);
		p.imageMode(p.CENTER);
		p.image(imgHeart,p.width/2,p.height/3.5,100,100);

		p.push();
		p.rotate(-p.radians(90));
		p.textAlign(p.CENTER, p.CENTER);
		p.textSize(14);
		p.text(hash1, -p.width/1.5,p.width/3.5);
		p.pop();

		p.push();
		p.rotate(p.radians(90));
		p.textAlign(p.CENTER, p.CENTER);
		p.textSize(14);
		p.text(hash2, p.width/1.5, -(p.width - p.width/3.5));
		p.pop();

		p.image(imgOrigami,p.width/2,p.height-p.height/8, imgOrigami.width/2,imgOrigami.height/2);
		p.image(imgSciss, p.width - p.width/4,p.height-p.height/2.74,imgSciss.width/4,imgSciss.height/4);

	}
}
var myp5 = new p5(s);