const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ObjectID = require('mongodb').ObjectID;
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const mySecret = process.env['MONGO_URI']
const { Schema } = mongoose;
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true })


app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const exercises = {
  description:String,
  duration:Number,
  date:String,
  
}

const userSchema = new Schema({
  username: { type: String, required: false },
  log: [exercises],
  count: { type: Number, default: 0 }
});

let users = [];


const User = mongoose.model("User", userSchema);

const findEveryUser = function() {
  User.find( { },{_id:1,username:1},function (err, data) {
    if (err) return console.log(err);
    users = data
})
};


findEveryUser();

const new_user_middleware = function (req,res,next) {

  const { username } = req.body;

  let created_user = new User({username: username});
  req.output=(created_user)
  created_user.save(function(err, data) {
      if (err) return console.error(err);
      //console.table(data)
    });
  next();
}

const get_users_middleware = (req,res,next) =>{

  findEveryUser();

  req.output = users;
  
  next();
}

const update_user_middleware = (req,res,next) =>{

  req.output={};
  let exeDate;
  const {description,duration,date } = req.body;
  const _id = req.params._id;
  const search_query= {"_id":_id};
  date ? exeDate = new Date(date).toDateString() : exeDate = new Date(Date.now()).toDateString()
  
  const exercises = {
      description: description,
      duration:duration,
      date:exeDate
    }
  const exercise_data= {
     $push: { log:exercises },
     $unset: { __v: 1},
     $inc: { count: 1}   
  }
  
  User.findByIdAndUpdate(search_query,exercise_data,{
      upsert: true, new: true
    },function(error, data) {
    if (error) throw error;
     
     req.output={
       username: data.username,
       _id: data._id,
       description:exercises.description,
       duration:Number(exercises.duration),
       date:exercises.date,
       }
     
  });
   setTimeout(() => {
    next();
  }, 125);
}

const format_log = (query_limit,data) =>{
  let formated_log;
  query_limit>0 ? formated_log=[data.log[query_limit-1]]:
  formated_log=data.log;
  return formated_log;
}

const format_count = (query_limit,data) =>{
  let formated_counter;
  query_limit>0 ? formated_counter=data.count-1:formated_counter=data.count;
  return formated_counter;
}

const fetch_log_middleware = (req,res,next) =>{
  const {_id} =req.params;
  const{limit,from,to}=req.query;
  let to_date,from_date;
  if(to&&from){
     to_date = new Date(to).toDateString();
     from_date = new Date(from).toDateString();
  }
  
  
  let query_limit = limit === undefined ? 0: Number(limit);

  User.findById(_id,function(error, data) {
    if (error) throw error;   
     req.output= {
       count: format_count(query_limit,data),
       log:format_log(query_limit,data),
       username: data.username,
       _id: _id
     };
    
  });
  
   setTimeout(() => {
    next();
  }, 125);
}

app.post('/api/users',new_user_middleware, function(req, res) {
  res.send(req.output);
});

app.post('/api/users/:_id/exercises',update_user_middleware, function(req, res) { 
  res.json(req.output);
}
);

app.get('/api/users/:_id/logs',fetch_log_middleware, function(req, res) { 
  res.json(req.output);
}
);

app.get('/api/users',get_users_middleware, function(req, res) {
  res.json(req.output);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})