// SERVER.JS file 
// Place app requiremtns/dependencies here
const express = require('express');
const path = require('path');
const app = express();
const mysql = require("mysql");
const pool = dbConnection();
const bodyParser = require('body-parser');
const axios = require('axios');
app.use(express.static('public'));
const multer = require('multer');
const upload = multer(); // setups multer with default settings


app.use(bodyParser.urlencoded({ extended: true }));

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');
const { exec } = require('child_process');
const { truncate } = require('fs');
const { executionAsyncResource } = require('async_hooks');


// ===================================================================
// MIDDLEWARE
// ===================================================================

// Use express-session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// ===================================================================
// Connection Calculation
// ===================================================================

//------------------------------------------------------
// create adjacency list out of friends data
//------------------------------------------------------

async function generateAdjacencyList(){
  const adjacency_list = new Map();


  // Query user IDs from the users_table
  let userIDsQuery = `SELECT id FROM users_table`; 
  let userIDs = await executeSQL(userIDsQuery);

  // Query friendship data from the friends_table
  let friendshipDataQuery = `SELECT * FROM friends_table`; 
  let rawFriendshipData = await executeSQL(friendshipDataQuery);

  // Format raw data to adjacency list
  for (let entry of rawFriendshipData) {
      let userID = entry.user_ID;
      let friendID = entry.friend_ID;

      // Initialize adjacency list for userID if not present
      if (!adjacency_list.has(userID)) {
          adjacency_list.set(userID, []);
      }

      // Add friendID to the adjacency list of userID
      adjacency_list.get(userID).push(friendID);
  }

  // Set users who are unreachable since they have no connections
  for (let userData of userIDs) {
    let userID = userData.id; // Extract user ID from RowDataPacket
    if (!adjacency_list.has(userID)) {
        adjacency_list.set(userID, []);
    }
  }

  return adjacency_list;
}

//---------------------------------------------
//                  BFS
//----------------------------------------------
async function bfs(adjacency_list, startUserID, endUserID) {
  // Initialize visited map to keep track of visited users and their distances
  let visited = new Map();

  // Initialize queue for BFS
  let queue = [];

  // Enqueue the start user ID with distance 0
  queue.push({ user: startUserID, distance: 0 });

  // Mark start user as visited
  visited.set(startUserID, 0);

  // While queue is not empty
  while (queue.length > 0) {
    // Dequeue a user from the queue
    let { user, distance } = queue.shift();

    // If the end user ID is found, return the distance
    if (user === endUserID) {
      return distance;
    }

    // Get the friends of the current user
    let friends = adjacency_list.get(user);
    if (friends) {
      // Iterate through the friend list
      for (let friendID of friends) {
        // If friend hasn't been visited
        if (!visited.has(friendID)) {
          // Mark friend as visited and record its distance
          visited.set(friendID, distance + 1);
          console.log("Visited friend", friendID, " : ", " distance: ", distance + 1, " visited: ", visited);
          // Enqueue friend with updated distance
          queue.push({ user: friendID, distance: distance + 1 });
        }
      }
    }
  }
  // If end user is not reachable from start user
  return -1;
}



// ===================================================================
// ROUTES 
// ===================================================================

// ---------------------------------------------
// GET ROUTES
// ---------------------------------------------

// ------- ROUTE --------------------
app.get('/', async (req, res) => {
    if (!req.session.user){
      res.redirect('login');
    }
    const user = req.session.user;
    let sql = "SELECT * FROM posts_table p JOIN friends_table f ON p.pet_owner_id = f.friend_ID  WHERE f.user_ID = ? AND p.post_visibility = ?";
    let friendPostData = await executeSQL(sql, [user.id, "Friends Only"]);
    sql = "SELECT * FROM posts_table WHERE post_visibility = ?";
    let publicPostData = await executeSQL(sql, "Public");
    let translation_out;
    let postId;
    if(req.query.translation_out && req.query.postId){
      translation_out = req.query.translation_out;
      postId = req.query.postId;
    }
    res.render('home', {
      title: 'Paws Connect',
      friendPost: friendPostData,
      publicPost: publicPostData,
      translation_out: translation_out,
      postId: postId,
    });
  });

// ------- Login --------------------
app.get('/login', async(req, res) => {
    res.render('login', {
        title: 'Paws Connect'
    });
  });

// ------- Create User --------------------
app.get('/createUser', async(req, res) => {
    res.render('createUser', {
        title: 'Paws Connect'
    });
  });

// ------- Search User --------------------
app.get('/search', async (req, res) => {
  const searchQuery = req.query.q;
  
  if (!searchQuery) {
    res.redirect(302, '/');
    return;
  }

  let userSearch = req.query.userSearch === 'on';                         // used for check box filter selection
  let userDisplayNameSearch = req.query.userDisplayNameSearch === 'on';   // used for check box filter selection
  let locationSearch = req.query.locationSearch === 'on';                 // used for check box filter selection
  let petId = req.query.petId === 'on';                                   // used for check box filter selection
  let petName = req.query.petName === 'on';                               // used for check box filter selection

  let userSql = "";             // declare user searchquery as an empty string
  let userDisplaySql = "";      // declareuser display name search query as an empty string
  let locationSql = "";         // declare location searchquery as an empty string
  let petIdSql = "";            // declare pet id search query as an empty string
  let petNameSql = "";           // declare pet name search query as an empty string


  if (userSearch)          // if box checked
  {
    userSql = "SELECT * FROM users_table WHERE user_name LIKE '%" + searchQuery + "%'"; // search user table for query of user name
  } 

  else if (userDisplayNameSearch)       // if box checked 
  {
    userDisplaySql = "SELECT * FROM users_table WHERE display_name LIKE '%" + searchQuery + "%'";    // search pet table for query of pet name
  } 

  else if (locationSearch)  // if box checked 
  {
    locationSql = "SELECT * FROM users_table WHERE location LIKE '%" + searchQuery + "%'"; // search user table for query of display name
  }

  else if (petId)  // if box checked 
  {
    petIdSql = "SELECT * FROM pets_table WHERE pet_id LIKE '%" + searchQuery + "%'"; // search user table for query of display name
  }

  else if (petName)  // if box checked 
  {
    petNameSql = "SELECT * FROM pets_table WHERE pet_name LIKE '%" + searchQuery + "%'"; // search user table for query of display name
  }


  try 
  {
    let userSearchResults = [];       // declares empty user result variable
    let userDisplayNameResults = [];   // declares empty userDisplayNameResult variable
    let locationResults = [];          // declares empty locationResult variable
    let petIdResults = [];             // declares petIdResult variable
    let petNameResults = [];           // declares petNameResult variable

    if (userSql) 
    {
      userSearchResults = await executeSQL(userSql); // pass user asynchronously through sql
    }

    if (userDisplaySql) 
    {
      userDisplayNameResults = await executeSQL(userDisplaySql); // pass user asynchronously through sql
    }

    if (locationSql) 
    {
      locationResults = await executeSQL(locationSql); 
    }

    if (petIdSql) 
    {
      petIdResults = await executeSQL(petIdSql); 
    }

    if (petNameSql) 
    {
      petNameResults = await executeSQL(petNameSql); 
    }

   

    res.render('search', 
    {
      title: `Search results for: ${searchQuery}`,    // search results title
      userSearchResults: userSearchResults,                         // pass user search results to webpage template
      userDisplayNameResults: userDisplayNameResults,   // pass pet search results to webpage template
      locationResults: locationResults,                // pass user Display Name results to webpage template
      petIdResults:petIdResults,
      petNameResults:petNameResults,
      searchQuery,                                   // pass search query into into template
    });
  } 
  catch (error) // if error display this message 
  {
    res.send('Error: ' + error.message);
  }
});


// ---------- profile user route.---------
// ---------- profile user route.---------

app.get('/profiles', async (req, res) => {    // route to user profiles//
  if (!req.session.user) {                    // if not logged in display message
    res.redirect('login');
  }

  const user = req.session.user; // contains session user information

  let userID;
  let friends;
  let requested;
  if(!req.query.user_id){
    userID = req.session.user.id;
    friends = false;
    requested = false;
  } else {
    userID = req.query.user_id;
    let sql1 = "SELECT * FROM friends_table WHERE user_ID = ?";
    let data = await executeSQL(sql1, [user.id]);
    data.forEach(element => {
      if(element.friend_ID == userID){
        friends = true;
      } else {
        friends = false;
      }
    });

    let sql2 = "SELECT * FROM messages WHERE sender_id = ? AND receiver_id = ?";
    let params = ([user.id, userID]);
    data = await executeSQL(sql2, params);  
    data.forEach(element => {
      if(element.is_friend_req == true){
         requested = true;
      } else {
          requested = false;
       }
    });
    
  }

  // SQL query to fetch user information
  let sql = "SELECT * FROM users_table WHERE id = ?";     // select from users_table where id = user
  let userData = await executeSQL(sql, userID);        // pass user id asynchronously through sql
  

  // SQL query to fetch posts for the user
  sql = "SELECT * FROM posts_table WHERE pet_owner_username = ?"; // select from posts_table where id = user
  let postsData = await executeSQL(sql, [userData[0].user_name]);        // pass user id asynchronously through sql
  let postCount = postsData.length;                               // counts number of posts user created

  // SQL query to fetch pets for the user
  sql = "SELECT * FROM pets_table WHERE owner_id = ?";  // select from pets_table where id = user
  let petData = await executeSQL(sql, userID);       // pass user id asynchronously through sql

  let translation_out;
  let postId;
  if(req.query.translation_out && req.query.postId){
    translation_out = req.query.translation_out;
    postId = req.query.postId;
  }

  res.render('profiles', {      // renders information for the user session for the profile template
      title: 'Paws Connect',    // title of profiles
      user: user,               // pass user id for the session to the template
      userData: userData[0],    // Pass user data from table to profile template
      postsData: postsData,     // Pass user's posts from table to profile template
      postCount: postCount,     // Pass post count to profile template
      petData: petData,         // Pass user's pets from table to profile template
      friends: friends,
      requested: requested,
      translation_out: translation_out,
      postId:postId,
  });
});

// ---------- Pet Profile ---------

app.get('/petProfile', async (req, res) => {
  if (!req.session.user) {
    res.redirect('login');
  }
  const user = req.session.user;
  let petID = req.query.pet_id;
  
  // SQL query to fetch pet information
  let sql = "SELECT * FROM pets_table WHERE pet_id = ?";
  let petData = await executeSQL(sql, petID);
 

  sql = "SELECT * FROM users_table WHERE id = ?"
  let ownerData = await executeSQL(sql, petData[0].owner_id);

  // SQL query to fetch posts for the pet
  // sql = "SELECT * FROM posts_table WHERE pet_owner_username = ?";
  sql = "SELECT * FROM posts_table p JOIN petsTaggedPosts_table tagged ON p.post_id = tagged.post_id WHERE tagged.pet_id = ?";
  let postsData = await executeSQL(sql, petData[0].pet_id);
  let postCount = postsData.length;
  let translation_out;
  let postId;
  if(req.query.translation_out && req.query.postId){
    translation_out = req.query.translation_out;
    postId = req.query.postId;
  }
  res.render('petProfile', {
      title: 'Paws Connect',
      pet: petData[0],
      user: user,
      owner: ownerData[0],
      postsData: postsData, // Pass the user's posts from table to the template
      postCount: postCount, // Pass the post count to the template
      translation_out: translation_out,
      postId:postId,
  });
});

// ------- Update User --------------------
// GET route for rendering updateUser page
app.get('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
      res.redirect('login');
    }

    // Access the user information stored in the session
    const user = req.session.user;

    // Render the updateUser page with the current user's information
    res.render('updateUser', {
        title: 'Paws Connect',
        user: user // Pass the user information to the template
    });
});
//------Update/Change Password------------
app.get('/updatePassword', async (req, res) =>{
  //Check if user is logged in (user information exists in session)
    if(!req.session.user){
      res.redirect('login');
    }

    //Render the updatePasswords page
    res.render('updatePassword',{
      title: "Paws Connect"
    });
});
//-------Create Pets--------------
app.get('/createPet', async (req, res) =>{
    // Check if user is logged in (user information exists in session)
    if (!req.session.user){
      res.redirect('login');
    }

    // Render the createPet page 
    res.render('createPet', {
        title: 'Paws Connect'});
});
//-----------Manage Pets ---------------
app.get("/updatePet", async (req, res) =>{
  //Check if user is Logged in (user information exists in session)
  if (!req.session.user){
    res.redirect('login');
  }
  const petID = req.query.pet_id;
  //hard coding to get first pet from ownsers list for now
  
  let sql = "SELECT * FROM pets_table WHERE pet_id = ?"

  try{
    let data = await executeSQL(sql, petID);
    //Render route
    res.render('updatePet',{
      title: 'Paws Connect',
      pet: data[0]})
  } catch (error){
    return res.send ("Error: " + error.message);
  }
});
//-----------Remove Pets-------------
app.get("/removePet", async (req,res) =>{
  //Check if user is logged in 
  if (!req.session.user){
    return res.send("You are not logged in!");
  }

  // get the petID of the current pet in consideration
  let pet_id = req.query.pet_id;
  //get information from petID
  let sql = "SELECT * FROM pets_table WHERE pet_id = ?";

  try{
    let data = await executeSQL(sql, pet_id);
    // render route 
    
    res.render('removePet', {
      title: 'Paws Connect',
      pet: data[0]})

  } catch (error) {
    return res.send("Error: " + error.message);
  }

});
//-----------Deleting Pet from Account--------------
app.get('/deletePet', async (req, res)=>{
  let pet_id = req.query.pet_id;
  
  // Delete the pet account from table
  let sql = "DELETE FROM pets_table WHERE pet_id = ?";

  try{
    //execute query
    await executeSQL(sql, pet_id);
    //redirect user to their profile
    res.redirect('profiles');
  } catch (error){
    return res.send('Error: ' + error.message);
  }
});

//-------------Pet Owner Create Post Route----------------------
app.get('/createPost', async (req, res) => {
  if (!req.session.user) {
    res.redirect('login');
  }
  const owner_id = req.session.user.id;
  let sql = "SELECT pet_id FROM pets_table WHERE owner_id = ?";
  let params = [owner_id];

  // Define post visibility options here
  const types = ["Public", "Friends Only"];  // Ensure these are defined

  try {
      let pets = await executeSQL(sql, params);
      res.render('createPost', {
          title: 'Paws Connect',
          pets: pets,
          types: types  // Pass types to Pug
      });
  } catch (error) {
      return res.send('Error in creating data: ' + error.message);
  }
});


// ------- transfer Pet Page --------------------
app.get('/transferPet', async(req, res) => {
  res.render('transferPet', {
      title: 'Paws Connect'
  });
});

// ------------Messages pet-----------------------
app.get('/messages', async(req, res) => {
  // Fetch messages from the database
  const user_id = req.session.user.id;

  sql = `SELECT messages.*, users_table.user_name AS sender_name
  FROM messages
  JOIN users_table ON messages.sender_id = users_table.id
  WHERE messages.receiver_id = ?`;
  values = [user_id];

  // Get recipient from the clicked message, if any
  const clickedRecipient = req.query.recipient;

  // Set currentRecipient based on the clicked recipient
  const currentRecipient = clickedRecipient ? clickedRecipient : "";

  let messages = await executeSQL(sql, values);

  // Render Pug template with fetched messages
  res.render('messages', {
    title: 'Paws Connect', 
    messages: messages,
    currentRecipient: currentRecipient
  });
});



//---------Connnections Get route--------------
app.get('/connections', async (req, res) => {
  res.render('connections', {title:'Paws Connect'});
});

  
//-------- Remove Friend ---------------
app.get('/removeFriend', async (req, res) => {
  const currentUser = req.session.user.id;
  const friendUser = req.query.user_id;
  let sql = "DELETE FROM friends_table WHERE user_ID = ? AND friend_ID = ?";
  try{
    await executeSQL(sql, [currentUser, friendUser]);
    await executeSQL(sql, [friendUser, currentUser]);
    res.redirect('profiles?user_id='+friendUser);
  } catch (error){
    res.send(error.message);
  }
});
// -------------get translatePost -----------------------
app.get('/translate', async (req, res) => {
let user = req.session.user;
let official_language = user.language;
if(!req.query.post_text){
  post_text = false;
}
let post_text = req.query.post_text;
let userId = user.id;
let postId = req.query.post_id;
// using 4 languages
var languageDict = {"English": "en", "Spanish":"es", "French":"fr", "German":"de"}
let language_code; 
for(var key in languageDict){
  if(key == official_language){
    language_code = languageDict[key];
  }
}
const TextTranslationClient = require("@azure-rest/ai-translation-text").default

const apiKey = "d5edd0531a6c40288ccbed0b7867920e";
const endpoint = "https://api.cognitive.microsofttranslator.com/";
const region = "westus2";

// async function main() {

  const translateCredential = {
    key: apiKey,
    region,
  };
  let translationClient = new TextTranslationClient(endpoint,translateCredential);
  let user_planguage = language_code;
  // const inputText = [{ text: "This is a test." }];
  let inputText = [{ text: post_text}];
  let translateResponse = await translationClient.path("/translate").post({
    body: inputText,
    queryParameters: {
      to: user_planguage,
      // from: "en",
    },
  });
  let translations = translateResponse.body;
  // console.log("TRANSLATIONS: BODY::", translateResponse.body)
  let translation_out;
  for (let translation of translations) {
    translation_out = translation?.translations[0]?.text;
  }
  try {
    res.redirect('/profiles?userId=' + userId + 
    '&translation_out=' + translation_out + '&postId='+postId);
} catch (error) {
    return res.send('Error in creating data: ' + error.message);
}

});
// translate home page posts
// -------------get translateHome -----------------------
app.get('/translateHome', async (req, res) => {
  let user = req.session.user;
  let official_language = user.language;
  if(!req.query.post_text){
    post_text = false;
  }
  let post_text = req.query.post_text;
  let userId = user.id;
  let postId = req.query.post_id;
  // using 4 languages
  var languageDict = {"English": "en", "Spanish":"es", "French":"fr", "German":"de"}
  let language_code; 
  for(var key in languageDict){
    if(key == official_language){
      language_code = languageDict[key];
    }
  }
  const TextTranslationClient = require("@azure-rest/ai-translation-text").default
  
  const apiKey = "d5edd0531a6c40288ccbed0b7867920e";
  const endpoint = "https://api.cognitive.microsofttranslator.com/";
  const region = "westus2";
  
  // async function main() {
  
    const translateCredential = {
      key: apiKey,
      region,
    };
    let translationClient = new TextTranslationClient(endpoint,translateCredential);
    let user_planguage = language_code;
    // const inputText = [{ text: "This is a test." }];
    let inputText = [{ text: post_text}];
    let translateResponse = await translationClient.path("/translate").post({
      body: inputText,
      queryParameters: {
        to: user_planguage,
        // from: "en",
      },
    });
    let translations = translateResponse.body;
    // console.log("TRANSLATIONS: BODY::", translateResponse.body)
    let translation_out;
    for (let translation of translations) {
      translation_out = translation?.translations[0]?.text;
    }
    try {
      res.redirect('/?userId=' + userId + 
      '&translation_out=' + translation_out +'&postId='+postId);
  } catch (error) {
      return res.send('Error in creating data: ' + error.message);
  }
  
  });
// -------------get translate Pet Profiles -----------------------
app.get('/translatePet', async (req, res) => {
  let user = req.session.user;
  let official_language = user.language;
  if(!req.query.post_text){
    post_text = false;
  }
  let post_text = req.query.post_text;
  let userId = user.id;
  let pet_id = req.query.pet_id;
  let postId = req.query.post_id;
  // using 4 languages
  var languageDict = {"English": "en", "Spanish":"es", "French":"fr", "German":"de"}
  let language_code; 
  for(var key in languageDict){
    if(key == official_language){
      language_code = languageDict[key];
    }
  }
  const TextTranslationClient = require("@azure-rest/ai-translation-text").default
  
  const apiKey = "d5edd0531a6c40288ccbed0b7867920e";
  const endpoint = "https://api.cognitive.microsofttranslator.com/";
  const region = "westus2";
  
  // async function main() {
  
    const translateCredential = {
      key: apiKey,
      region,
    };
    let translationClient = new TextTranslationClient(endpoint,translateCredential);
    let user_planguage = language_code;
    // const inputText = [{ text: "This is a test." }];
    let inputText = [{ text: post_text}];
    let translateResponse = await translationClient.path("/translate").post({
      body: inputText,
      queryParameters: {
        to: user_planguage,
        // from: "en",
      },
    });
    let translations = translateResponse.body;
    let translation_out;
    for (let translation of translations) {
      translation_out = translation?.translations[0]?.text;
    }
   
    try {
      res.redirect('/petProfile?pet_id=' + pet_id + '&userId=' + userId +
      '&translation_out=' + translation_out +'&postId='+postId);
  } catch (error) {
      return res.send('Error in creating data: ' + error.message);
  }
  
  });



// ---------------------------------------------
// END GET ROUTES
// ---------------------------------------------

// ------------------------------------------------------------------------
// POST ROUTES
// ------------------------------------------------------------------------

// ----------POST login route.----------------
// POST route for handling login
app.post('/login', async(req, res) => {
    const user_name = req.body.username;
    const password = req.body.password;

    // Check if the entered username exists in the database
    let sql = "SELECT * FROM users_table WHERE user_name = ?";
    let user = await executeSQL(sql, [user_name]);

    if (user.length === 0) {
        return res.send('Invalid username');
    }

    // Now, you have the user record, you can compare the password
    const storedPassword = user[0].password;

    // Compare storedPassword with the provided password
    const passwordMatch = await bcrypt.compare(password, storedPassword);

    if (!passwordMatch) {
        return res.send('Invalid password');
    }

    // Store the user's information in the session
    req.session.user = user[0];

    // Authentication successful, redirect to dashboard or another page
    res.redirect('/profiles');
});


// ----------POST create user route.----------
app.post('/createUser', async(req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const displayName = req.body.display_name;
    const profilePicture = req.body.profile_picture;
    const preferredLang = req.body.preferred_lang;
    //const confirmPassword = req.body.confirm_password;
  
    // Check if passwords match
    // if (password !== confirmPassword) {
    //   return res.send('Passwords do not match');
    // }
  
    // Check for existing email 
    let userCheckSql = "SELECT * FROM users_table WHERE email = ?";
    let existingUser = await executeSQL(userCheckSql, [email]);
  
    if (existingUser.length > 0) {
      return res.send("Email already exists.");
    }
  
   
    // Execute the query
    try {
      // Hash and salt the password
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // SQL query to insert the user into the database with hashed password
      var sql = "INSERT INTO users_table (email, password, user_name, display_name, profile_img, language) VALUES (?, ?, ?, ?, ?, ?)";
      var values = [email, hashedPassword, username, displayName, profilePicture, preferredLang];

      // Execute the query
      await executeSQL(sql, values);

      res.redirect('/login');

  } catch (error) {
      return res.send('Error creating user: ' + error.message);
  }
  
  });

// ----------POST update user route.----------
app.post('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
      res.redirect('login');
    }

    // Get the new information from the form submission
    const newEmail = req.body.new_email;
    const newDisplayName = req.body.new_display_name;

    const newProfPic = req.body.new_profile_img;

    const newLang = req.body.new_preferred_lang;

    // Update the user's information in the database
    let sql = "UPDATE users_table SET email = ?, display_name = ?, profile_img = ?, language = ? WHERE id = ?";
    try {
        await executeSQL(sql, [newEmail, newDisplayName, newProfPic, newLang, req.session.user.id]);
        // Update the user information in the session as well
        req.session.user.email = newEmail;
        req.session.user.display_name = newDisplayName;
        req.session.user.profile_img = newProfPic;
        req.session.user.language = newLang;
        // You might not want to store the new password in the session for security reasons

        res.redirect("profiles");
    } catch (error) {
        return res.send('Error updating user information: ' + error.message);
    }
});

//------------POST Update Password Route
app.post('/updatePassword', async (req, res) => {
  //Check if user is logged in (user information exists in session)
  if (!req.session.user){
      res.redirect('login');
  }

  //Get new information from the form submition
  const currentPassword = req.body.current_password;
  const newPassword = req.body.new_password;
  const confirmPassword = req.body.confirm_new_password;

  //Compare current password with stored password to authorize change
   const storedPassword = req.session.user.password;
   const passwordAuth = await bcrypt.compare(currentPassword, storedPassword);

   if (!passwordAuth){
      return res.send("Invalid Current Password");
   }

   //Compare the new passwords to eachother
   if (newPassword !== confirmPassword){
      return res.send('New passwords do not match');
   }

   //Update the database table
   try {
    //Hash and salt the password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // SQL query to update users password
      let sql = "UPDATE users_table SET password = ? WHERE id = ?";
      let params = [hashedPassword, req.session.user.id];

      //Execute the query
      await executeSQL(sql, params);
      res.redirect('login');
  } catch (error) {
    return res.send("Error updating password: " + error.message);
  }

});

//-------------POST Create Pet Profile Route----------------------
app.post('/createPet', async (req, res) => {
  // Check if user is logged in (user information exists in session)
  if (!req.session.user){
    res.redirect('login');
  }

  // Get the new information from the form submission
  const petID = req.body.pet_id;    
  const petName = req.body.pet_name;
  const petType = req.body.pet_type;
  const petBreed = req.body.pet_breed;
  const petProfile = req.body.pet_image;
  const petBio = req.body.pet_bio;
  
  //Check for existing petID
  let petCheckSQL = "SELECT * FROM pets_table WHERE pet_id = ?";
  let existingPet = await executeSQL(petCheckSQL, [petID]);

  if (existingPet.length > 0) {
    return res.send("Pet ID is already taken!");
  }

  // Insert the information into database table
  let sql = `INSERT INTO pets_table (pet_id, pet_name, pet_type, pet_breed, profile_image, pet_bio, owner_id)
             VALUES (?,?,?,?,?,?, ?)`;
  let values = [petID, petName, petType, petBreed, petProfile, petBio, req.session.user.id];

  //Execute the query
  try{
    await executeSQL(sql, values);
    res.redirect('profiles');
  } catch (error) {
    return res.send ('Error in creating pet: ' + error.message);
  }
 });

 //-------------POST Update Pet Profile Route-------------------------
 app.post('/updatePet', async (req,res) => {
  //Check if user is logged in
  if (!req.session.user){
    res.redirect('login');
  }
  const petID = req.body.pet_id;
  const newName = req.body.new_pet_name;
  const newType = req.body.new_pet_type;
  const newBreed = req.body.new_pet_breed;
  const newBio = req.body.new_pet_bio;
  const newImage = req.body.new_profile_image;

  let sql = "UPDATE pets_table SET pet_name = ?, pet_type = ?, pet_breed = ?, pet_bio = ?, profile_image = ? WHERE pet_id = ?"
  let values = [newName,newType, newBreed, newBio, newImage, petID];

  try{
    await executeSQL(sql, values);
    res.send('Pet has been updated!');
  } catch (error){
    return res.send('Error in updateing pet: ' + error.message);
  }

 });
//-------------POST Pet Owner Create Post Route----------------------
app.post('/createPost', async (req, res) => {
  // Check if user is logged in 
  if (!req.session.user){
    res.redirect('/login');
  }
  
  const postImage = req.body.posting_image;
  const postText = req.body.post_text;
  const stringTagPet = req.body.post_tag;
  const pet = req.body.pet_petId;
  const timestamp = new Date().valueOf();
  // Insert the information
  let sql = `INSERT INTO posts_table (pet_owner_id,pet_owner_username, posting_image, post_text, stringTagPet,pet_id, post_timeStamp)
             VALUES (?,?,?,?,?,?,?)`;
  let values = [req.session.user.id, req.session.user.user_name, postImage, postText, stringTagPet, pet, timestamp];
  
  //Execute the query
  
  try{
    await executeSQL(sql, values);
    res.redirect('profiles');
  } catch (error) {
    return res.send ('Error in creating post: ' + error.message);
  }
  
  });

// ----------POST  INITATE TRANSFER PET  route.----------------
// POST route for handling Initiate pet transfer
app.post('/IntitiateTransfer', async (req, res) => {
  const receivingUsername = req.body.username;
  const petName = req.body.petUserName;
  const sendingUser = req.session.user.user_name;
  console.log(receivingUsername);

  // Get sender and receiver IDs
  let sql1 = 'SELECT id FROM users_table WHERE user_name = ?';

  // Get pet ID
  let sql2 = 'SELECT id FROM pets_table WHERE pet_name = ?';
  let values2 = [petName];

  try {
    // Execute queries
    let petResult = await executeSQL(sql2, values2);
    let senderResult = await executeSQL(sql1, [sendingUser]);
    let receiverResult = await executeSQL(sql1, [receivingUsername]);

    // Extract IDs
    let senderId = senderResult[0].id;
    let receiverId = receiverResult[0].id;
    let petId = petResult[0].id;
  
    // Insert into messages table
    let sql3 = `INSERT INTO messages (sender_id, receiver_id, message_content, is_transfer, pet_id)
                VALUES (?, ?, ?, ?, ?)`;
    let values3 = [senderId, receiverId, 'Transfer pet?', true, petId];
    await executeSQL(sql3, values3);
  
    // Render a success message or confirmation page
    res.send('Pet transfer initiated successfully' + "Send " + senderId + " rec " + receiverId );
    res.redirect('/');
  } catch (error) {
    return res.send('ERROR in Transfer ' + error.message);
  }
  
});

// ---------- Send message Get route.---------
app.post('/sendmessage', async (req, res) => {
   // Extract data from the request body
   const recipient_username = req.body.recipient;
   const message = req.body.message;
    
   // Assuming you have session handling middleware to get the user ID
   const sender_id = req.session.user.id;
   console.log("ID: " + sender_id);

   const sql1 = `SELECT id FROM users_table WHERE user_name = ?`;
   const values1 = [recipient_username];

   let result = await executeSQL(sql1, values1);
   let user_id = result[0].id;

   // Insert the message into the database
   const sql = `INSERT INTO messages (sender_id, receiver_id, message_content) VALUES (?, ?, ?)`;
   const values = [sender_id, user_id, message];

   try {
       // Execute the SQL query to insert the message
       await executeSQL(sql, values);
       res.redirect('\messages');
   } catch (error) {
       // Handle errors appropriately, such as rendering an error page or sending an error response
       console.error("Error sending message:", error);
       res.status(500).send("Error sending message. Please try again later.");
   }
});

// -----------------Accept/Transfer Post Route --------------------------
app.post('/acceptTransfer', async (req, res) => {
  const recipient = req.session.user; 
  const messageId = req.body.messageId; 
  const sender_id = req.body.senderId;
  const pet_id = req.body.pet_id; 
  const action = req.body.action;

  if(action === "accept"){
    try {
      // Update pets_table to change the owner
      const sql1 = `UPDATE pets_table SET owner_id = ? WHERE id = ?`;
      const values1 = [sender_id, pet_id];
      await executeSQL(sql1, values1);

      // Remove the associated message from messages table
      const sql2 = `DELETE FROM messages WHERE message_id = ?`;
      const values2 = [messageId];
      await executeSQL(sql2, values2);

      // send new owner message if accepted
      const newOwnerMessage = `Congratulations! Your request to transfer ownership of the pet has been accepted.`;
      const sql3 = `INSERT INTO messages (sender_id, receiver_id, message_content) VALUES (?, ?, ?)`;
      const values3 = [recipient.id, sender_id, newOwnerMessage];
      await executeSQL(sql3, values3);

      res.status(200).send("Transfer accepted successfully.");
    } catch (error) {
      console.error("Error accepting transfer:", error);
      res.status(500).send("Error accepting transfer.");
    }
  }
  if(action ==="deny"){
     // Remove the associated message from messages table
     const sql2 = `DELETE FROM messages WHERE message_id = ?`;
     const values2 = [messageId];
     await executeSQL(sql2, values2);
  }
 
});

app.post('/messages', (req, res) => {
  // Handle sending messages
  // Save message to the database
  // Redirect back to the message center page

});

// -----------------Accept/Transfer Post Route --------------------------
app.post('/acceptTransfer', async (req, res) => {
  const recipient = req.session.user; 
  const messageId = req.body.messageId; 
  const sender_id = req.body.senderId;
  const pet_id = req.body.pet_id; 
  const action = req.body.action;

  if(action === "accept"){
    try {
      // Update pets_table to change the owner
      const sql1 = `UPDATE pets_table SET owner_id = ? WHERE id = ?`;
      const values1 = [sender_id, pet_id];
      await executeSQL(sql1, values1);

      // Remove the associated message from messages table
      const sql2 = `DELETE FROM messages WHERE message_id = ?`;
      const values2 = [messageId];
      await executeSQL(sql2, values2);

      // send new owner message if accepted
      const newOwnerMessage = `Congratulations! Your request to transfer ownership of the pet has been accepted.`;
      const sql3 = `INSERT INTO messages (sender_id, receiver_id, message_content) VALUES (?, ?, ?)`;
      const values3 = [recipient.id, sender_id, newOwnerMessage];
      await executeSQL(sql3, values3);

      res.status(200).send("Transfer accepted successfully.");
    } catch (error) {
      console.error("Error accepting transfer:", error);
      res.status(500).send("Error accepting transfer.");
    }
  }
  if(action ==="deny"){
     // Remove the associated message from messages table
     const sql2 = `DELETE FROM messages WHERE message_id = ?`;
     const values2 = [messageId];
     await executeSQL(sql2, values2);
  }
 
});
// -----------------Send Friend Request POST Route ---------------------
app.get('/friendReq', async (req,res) =>{
  const senderId = req.session.user.id;
  const receiverId = req.query.user_id;
  
  //Check if already requested./friends

  //send message
  let sql = "INSERT INTO messages (sender_id, receiver_id, message_content, is_friend_req) VALUES (?, ?, ?, ?)";
  let values = [senderId, receiverId, "Friend Request!", true];
  try {
    await executeSQL(sql, values);
    res.redirect("profiles?user_id="+receiverId);
  } catch (error) {
    res.send("error" + error.message);
  }
  
});
//----------------------Accept Friend Request POST route ------------------------
app.post('/acceptFriend', async (req, res) =>{
  const recipient = req.session.user.id;
  const sender = req.body.sender_id;
  const message = req.body.message_id;
  const answer = req.body.answer;
  if (answer === "Accept"){
    //two sqls to register under both user id's
    let sql = "INSERT INTO friends_table (user_id, friend_id) VALUES (?,?)";
    let values1 = [recipient,sender];
    let values2 = [sender,recipient];
    await executeSQL(sql,values1);
    await executeSQL(sql,values2); 
  }
  //If "deny" do nothing

  //delete message from database
    let sql1 = "DELETE FROM messages WHERE message_id = ?";
    await executeSQL(sql1, message);
  //redirect page
  res.redirect('messages')
});

app.post('/connections', upload.none(), async (req, res) => {
  const curUserId = req.session.user.id;
  const username = req.body.username;
  
  if (!username) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const userIDQuery = `SELECT id FROM users_table WHERE user_name = ?`;
  const userIDs = await executeSQL(userIDQuery, [username]);

  if (!userIDs.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const adjacency_list = await generateAdjacencyList();
  const connectionsRemoved = await bfs(adjacency_list, curUserId, userIDs[0].id);
  
  res.json({ connectionsRemoved });
});

// ===================================================================
// DATA BASE SET UP
// ===================================================================
//------------------Execute Sql----------------------------------
function executeSQL(sql, params) {
  return new Promise(function(resolve, reject) {
    pool.query(sql, params, function(err, rows, fields) {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// ---------------DataBase Connection-------------------------
function dbConnection(){
  const pool = mysql.createPool({
    connectionLimit: 10,
    host: "hngomrlb3vfq3jcr.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "r8y141rt6xns3ejq",
    password: "zwv1v6y4c0dffay3",
    database: "bxr2et3njo3yvg0y"
  });

  // Check for connection errors
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(".......Error connecting to the database:", err);
      return;
    }
    console.log("......Connected to the database!");
    connection.release(); // Release the connection
  });
  return pool;
}

// ===================================================================
//  APP RUN
// ===================================================================

const server = app.listen(process.env.PORT || 3000, async () => {
  console.log(`Paws server started on port: ${server.address().port}`);
  const list = await generateAdjacencyList();
});