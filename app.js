const express = require('express');
const path = require('path');
let app = express();
const mysql = require('mysql');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');

app.set('view engine', 'ejs');
//this static line wasn't used in week 9, just fyi if it becomes redundant
app.use(express.static(path.join(__dirname, '/public')));

app.use(express.urlencoded({ extended: true }));

const hour = 1000 * 60 * 60 * 1;

app.use(cookieParser());

app.use(sessions({
    secret: "letmein12356",
    saveUninitialized: true,
    cookie: { maxAge: hour },
    resave: false 
}));

const connection = mysql.createConnection({
  host:'localhost',
  user: 'root',
  password: 'root',
  database: 'stacksofwax',
  port: '3306',
  multipleStatements: true
});

connection.connect((err)=>{
  if(err) return console.log(err.message);
  console.log("connected to local mysql db");
});

//when you first open your app, 9b:
app.get('/', (req, res)=> {
let sessionobj = req.session;
if (sessionobj.sess_valid){
  //if logged in, you are taken to your dashboard - I think you should just be taken to index whether logged in or not?
  res.render('index');
 
} else {
  //res.send(`<p>You have not logged in yet. Login <a href='/login'>here</a></p>`);
  //otherwise taken to home page. 
  res.render('login');
}
});

//home page
app.get('/index', (req, res) => {
  let sessionobj = req.session;
  sessionobj.sess_valid = true;
  res.render('index');
});

//if you haven't logged in yet, you will be invited to login:
app.get('/login', (req, res)=>{
  let sessionObj = req.session;
  sessionObj.sess_valid = true;
 // res.send(`<br><p>logged in: <a href='/dashboard'>Manage your collection</a> </p>`);
 res.render('login');
});

//login verification (lab):
app.post('/login', (req, res)=> {
  let username = req.body.usernameField;
  let checkuser = `SELECT user_id, user_name, user_password 
                  FROM site_users 
                  WHERE user_name = ?`;
  connection.query(checkuser, [username], (err, rows)=> {
    if(err) throw err;
    let numrows = rows.length;
    if(numrows>0){
      let sessionobj = req.session;
      sessionobj.authen = rows[0].user_id;
      res.redirect('dashboard');
    } else {
      res.redirect('login');
    }
  })
  });

app.get('/register', (req, res)=> {
  let sessionobj = req.session;
  sessionobj.sess_valid = false;
res.render('register');
});

//to log out at any point:
app.get('/logout', (req, res)=> {
  //for logging out, we just need to destroy the session. think of it as un-logging in.
  req.session.destroy;
  //now redirect to home page
  res.redirect('/index');
});

//user's dashboard of their collection
app.get('/dashboard', (req,res) => {
    let sessionobj = req.session;
  //is this supposed to be .authen or .valid? I had .authen from wk9 lab but gonna change to ses_valid in accordance with 9b lecture for now. 
    if(sessionobj.sess_valid){
    let getuserid = sessionobj.authen;
    let useralbums = `SELECT album_id, album_name, album_year, album_artwork_url FROM album WHERE album_id IN (
                      SELECT album_id FROM album_collection WHERE collection_id IN ( 
                      SELECT collection_id FROM collection WHERE user_id IN ( 
                      SELECT user_id FROM site_users WHERE user_id = ?)));
                      SELECT user_id, user_name 
                      FROM site_users 
                      WHERE user_id = ?;`
    connection.query(useralbums, [getuserid, getuserid], (err, albumrows)=>{
      if(err) throw err;
      let albumstuff = albumrows[0];
      let userstuff = albumrows[1];
      res.render('dashboard', {albumstuff, userstuff});
    });
        
   //   });
  }else{
      res.redirect('login');
  } 
});

//wait hang on, dunno how to do this. sit tight. 
app.get('/delete', (req, res)=> {
  let sessionobj = req.session;
  if(sessionobj.sess_valid){
  let albumid = req.query.aid;
  //let collectionid = req.query.cid;
  // let getalbum = `SELECT *FROM album
  //                 WHERE album_id = ?;
  //                 SELECT * FROM album_collection
  //                 WHERE album_collection_id=?`;
  //trying a different SQL query
  let getdeletedata = `SELECT album_collection.album_collection_id, album_collection.album_id,
                       album_collection.collection_id
                       FROM album_collection
                       INNER JOIN collection
                       ON album_collection.collection_id = collection.collection_id 
                       WHERE album_id = ?`;
  connection.query(getdeletedata, [albumid], (err, row)=> {
  if(err) throw err;
  res.render('delete', {row});
  });
}
});



app.post('/delete', (req, res)=> {
  let sessionobj = req.session;
  if(sessionobj.sess_valid){
  
  let acid = req.body.id_field;
  //obvs need to be receiving the album collection id here babes
  let deletesql = `DELETE FROM album_collection 
                    WHERE album_collection.album_collection_id = ?;`;
  connection.query(deletesql, [acid], (err, row)=> {
  if(err) throw err;
  if (result){
    res.redirect('dashboard');
  }
}); 
  } else {
    res.send('<h2>soz</h2>')
  }
});

//displays all albums in database
app.get('/library', (req, res) => {
  let read = `SELECT album_id, album_name, album_year, album_artwork_url FROM album`;
  connection.query(read, (err, albumdata) => {
    if (err) throw err;
  res.render('library', {albumdata});
  });
});

//displays details of a specific album
app.get('/vinyl', (req, res) => {
  let getid = req.query.vid;
  let getrow = `SELECT album.album_id, album.album_name, album.number_tracks, album.album_year, 
                album.record_company, album.album_artwork_url, artist.artist_name
                FROM album 
                INNER JOIN artist
                ON album.artist_id = artist.artist_id
                WHERE album_id = ?;
                SELECT track.track_name, track.track_length 
                FROM album_track 
                INNER JOIN track
                ON album_track.track_id = track.track_id
                WHERE album_id = ?`;            
  connection.query(getrow, [getid, getid], (err, albumrow)=> {
    if(err) throw err;
    let albumdeets = albumrow[0];
    let albumtracks = albumrow[1];
    res.render('vinyl', {albumdeets, albumtracks});
  });
 
});


  // app.get('/verify', (req, res) => {
  //   let sessionobj = req.session;
  //   if (sessionobj.sess_valid = true){
  //     res.render('library');
  //   } else {
  //     res.render('register');
  //   }
  // });

app.listen(process.env.PORT || 3000);
console.log('Server is listening on http://localhost:3000/');