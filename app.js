var express=require('express');
var app=express();
var mongoose=require("mongoose");
mongoose.connect("mongodb+srv://jatin_verma:Lumax@2001@cluster0-wiob7.mongodb.net/test?retryWrites=true&w=majority",{
	useNewUrlParser:true,
	useCreateIndex:true
}).then(()=>{
	console.log("connected to DB!");
}).catch(err=>{
	console.log("error");
});
var bodyparser=require('body-parser');
var passport=require("passport");
var LocalStrategy=require("passport-local");
var methodOverride=require("method-override");

app.use(bodyparser.urlencoded({extended:true}));



app.set('view engine','ejs');

var Campground=require("./models/campground");
var seedDB=require("./seed");
var User=require("./models/user");
var Comment   = require("./models/comment");
//seedDB();

//AUTHENTICATION
app.use(require("express-session")({
		secret:"pappy",
		resave:false,
		saveUninitialized:false
		}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(methodOverride("_method"));
app.use(function(req,res,next){
	res.locals.currentUser=req.user;
	next();
});
////////////ALL ROUTES/////////////////

app.get("/",function(req,res){
	res.render("landing");
});


///INDEX
app.get('/campgrounds',isLoggedIn,function(req,res){
	Campground.find({},function(err,allcampgrounds){
		if(err){
			console.log("error");
		}else{
			res.render("index",{campgrounds:allcampgrounds});
		}
	});
	
});
//NEW
app.post('/campgrounds',isLoggedIn,function(req,res){
	var name=req.body.name;
	var image=req.body.image;
	var desc=req.body.description;
	var author={
		id:req.user._id,
		username:req.user.username
	};
	var newcampground={name:name,image:image, description: desc, author:author};
	Campground.create(newcampground,function(err,newcampground){
		if(err){
			console.log("error");
		}
		else{
			res.redirect('/campgrounds');
		}
	});
	
	
});
//CREATE
app.get('/campgrounds/new',isLoggedIn,function(req,res){
	res.render('new');
});
//SHOW
app.get("/campgrounds/:id",function(req,res){
	Campground.findById(req.params.id).populate("comments").exec(function(err,foundcampground){
		if(err){
			console.log("errrp");
		}else{
			
			res.render("show",{foundcampground:foundcampground});
			
		}
	});
	
});

//EDIT
app.get("/campgrounds/:id/edit",isAuthorised,function(req,res){
	Campground.findById(req.params.id,function(err,foundcampground){
	res.render("edit",{camp:foundcampground});
	});
});
		
	
//UPDATE
app.put("/campgrounds/:id",isAuthorised,function(req,res){
	
		Campground.findByIdAndUpdate(req.params.id,req.body.campground,function(err,updatedcampground){
		if(err){
			console.log(err);
		}else{
			
				res.redirect("/campgrounds/" + req.params.id);
			
		}
	});
});
//DESTROY ROUTE
	app.delete("/campgrounds/:id", isAuthorised,function(req,res){
	
		Campground.findByIdAndRemove(req.params.id,function(err){
		if(err){
			console.log(err);
		}else{
			res.redirect("/campgrounds");
		}
		
	});
});
	


//comment routes
app.get("/campgrounds/:id/comment/new",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,campground){
		if(err)
			{
				console.log(err);
			}else{
				res.render("newcomment",{campground:campground});
			}
	});
	
});

app.post("/campgrounds/:id/comment",isLoggedIn,function(req,res){
	Campground.findById(req.params.id,function(err,camp){
		if(err){
			res.redirect("/campgrounds");
		}else{
			Comment.create(req.body.comment,function(err,comm){
				if(err){
					console.log(err);
				}
				else{
				
              comm.author.id = req.user._id;
               comm.author.username = req.user.username;
				comm.save();
				camp.comments.push(comm);
				camp.save();
					console.log(comm);
				res.redirect("/campgrounds/"+camp._id);
				}
			});
		}
	});
});
//EDIT COMMENT ROUTE
app.get("/campgrounds/:id/comment/:comment_id/edit",isCommentAuthorised,function(req,res){
	Comment.findById(req.params.comment_id,function(err,comment){
		if(err)
			{
				console.log(err);
			
			}else{
				res.render("comment_edit",{campground_id:req.params.id,comment:comment});
			}
	});
});
//UPDATE COMMENT ROUTE
app.put("/campgrounds/:id/comment/:comment_id",function(req,res){
	Comment.findByIdAndUpdate(req.params.comment_id,req.body.comment,function(err){
		if(err){
			console.log(err);
		}else{
			res.redirect("/campgrounds/"+req.params.id);
		}
	});
	
});

//DELETE COMMENT ROUTE

///AUTH ROUTES
app.get("/register",function(req,res){
	res.render("register");
});

app.post("/register",function(req,res){
	var newUser=new User({username:req.body.username});
	User.register(newUser,req.body.password,function(err,user){
		if(err){
			console.log("fuck u");
		}else{
			passport.authenticate("local")(req,res,function(){
				res.redirect("/campgrounds");
			});
		}
	});
});
//LOGIN ROUTES
app.get("/login",function(req,res){
	res.render("login");
});
app.post("/login",passport.authenticate("local",{
	successRedirect:"/campgrounds",
	failureRedirect:"/register"
}),function(req,res){
	
});

//LOGOUT ROUTE
app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/");
});

//MIDDLEWARE
function isLoggedIn(req,res,next){
	if(req.isAuthenticated())
		{
			return next();
		}
	res.redirect("/login");
}

//MIDDLEARE FOR CAMPGROUNDS
function isAuthorised(req,res,next){
	if(req.isAuthenticated()){
		Campground.findById(req.params.id,function(err,foundcampground){
		
			if(req.user._id.equals(foundcampground.author.id))
					  {
					  	next();
					  }
				else {
					res.redirect("back");
				}
					
			});
		
}
							}
//MIDDLE WARE FOR COMMENTS
function isCommentAuthorised(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.comment_id,function(err,foundcomment){
			if(req.user._id.equals(foundcomment.author.id))
				{
					next();
				}
			else {
					res.redirect("back");
				}
		});
	}
}
app.listen(process.env.PORT||3000,function(){
		   console.log("YElpcam has started");
		   });