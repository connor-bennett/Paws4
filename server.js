// SERVER.JS file 
// Place app requiremtns/dependencies here
// DB connection and SQL
// Wire up to routes here

const express = require('express');
const path = require('path');
const app = express();
const mysql = require("mysql");
const pool = dbConnection();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
const session = require('express-session');
const { exec } = require('child_process');

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
// ROUTES 
// ===================================================================

// ---------------------------------------------
// GET ROUTES
// ---------------------------------------------

// ------- ROUTE --------------------
app.get('/', (req, res) => {
    res.render('home', {
      title: 'Paws Connect',
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

// ---------- profile user route.---------
// ---------- profile user route.---------

app.get('/profiles', async (req, res) => {
  if (!req.session.user) {
      return res.send('You are not logged in');
  }

  const user = req.session.user;

  // SQL query to fetch user information
  let sql = "SELECT * FROM users_table WHERE id = ?";
  let userData = await executeSQL(sql, [user.id]);

  // SQL query to fetch posts for the user
  sql = "SELECT * FROM posts_table WHERE pet_owner_username = ?";
  let postsData = await executeSQL(sql, [user.user_name]);
  let postCount = postsData.length;

  // SQL query to fetch pets for the user
  sql = "SELECT * FROM pets_table WHERE owner_id = ?";
  let petData = await executeSQL(sql, [user.id]);

  res.render('profiles', {
      title: 'Paws Connect',
      user: user,
      userData: userData[0], // Pass the user data from table to the template
      postsData: postsData, // Pass the user's posts from table to the template
      postCount: postCount, // Pass the post count to the template
      petData: petData, // Pass the user's pets from table to the template
  });
});

// ---------- Pet Profile ---------

app.get('/petProfile', async (req, res) => {
  if (!req.session.user) {
      return res.send('You are not logged in');
  }

  let petID = req.query.pet_id;
  const user = req.session.user;
  // SQL query to fetch pet information
  let sql = "SELECT * FROM pets_table WHERE pet_id = ?";
  let petData = await executeSQL(sql, petID);

  // SQL query to fetch posts for the pet
  sql = "SELECT * FROM posts_table WHERE pet_owner_username = ?";
  let postsData = await executeSQL(sql, [user.user_name]);
  let postCount = postsData.length;


  res.render('petProfile', {
      title: 'Paws Connect',
      pet: petData[0],
      user: user,
      postsData: postsData, // Pass the user's posts from table to the template
      postCount: postCount, // Pass the post count to the template
  });
});






// ------- Update User --------------------
// GET route for rendering updateUser page
app.get('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
        return res.send('You are not logged in');
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
      return res.send("You are not logged in");
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
      return res.send('You are not logged in');
    }

    // Render the createPet page 
    res.render('createPet', {
        title: 'Paws Connect'});
});

//-----------Manage Pets ---------------
app.get("/updatePet", async (req, res) =>{
  //Check if user is Logged in (user information exists in session)
  if (!req.session.user){
    return res.send('You are not logged in!');
  }

  let petID = req.query.pet_id;
  
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
  // Check if user is logged in 
if (!req.session.user){
  return res.render('home',{errorMessage: 'Need to log in first. '})
  // return res.send('Not logged in');
}
const owner_id = req.session.user.id;
let sql = "SELECT pet_id FROM pets_table WHERE owner_id = ?";
let params = [owner_id];

//Execute the query
try{
  let data = await executeSQL(sql, params);

  res.render('createPost',{
    title: 'Paws Connect',
    pets: data})
  
} catch (error) {
  return res.send ('Error in creating data: ' + error.message);
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
  sender_id = req.session.user.id;

  sql = `SELECT messages.*, users_table.user_name AS sender_name
  FROM messages
  JOIN users_table ON messages.sender_id = users_table.id
  WHERE messages.receiver_id = ?`;
  values = [sender_id];

  // Get recipient from the clicked message, if any
  const clickedRecipient = req.query.recipient;

  // Set currentRecipient based on the clicked recipient
  const currentRecipient = clickedRecipient ? clickedRecipient : "";

  let messages = await executeSQL(sql, values);

  // Render Pug template with fetched messages
  res.render('messages', {
    title: 'Paws Connect', 
    messages: messages,
    sender_id: sender_id,
    currentRecipient: currentRecipient
  });
});


// ---------- profile user route.---------
app.get('/profiles', (req, res) => {
  let sql = 'SELECT user_name FROM users_table';
  pool.query(sql, (err, result) => {
    if (err) throw err;
    res.render('profiles', { user_name: result });
  });
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
      res.redirect('profiles');
  } catch (error) {
      return res.send('Error creating user: ' + error.message);
  }
  
  });

// ----------POST update user route.----------
app.post('/updateUser', async (req, res) => {
    // Check if user is logged in (user information exists in session)
    if (!req.session.user) {
        return res.send('You are not logged in');
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

        res.redirect('profiles');
    } catch (error) {
        return res.send('Error updating user information: ' + error.message);
    }
});

//------------POST Update Password Route
app.post('/updatePassword', async (req, res) => {
  //Check if user is logged in (user information exists in session)
  if (!req.session.user){
      return res.send("You are not logged in");
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
      res.redirect('profiles');
  } catch (error) {
    return res.send("Error updating password: " + error.message);
  }

});

//-------------POST Create Pet Profile Route----------------------
app.post('/createPet', async (req, res) => {

// Check if user is logged in (user information exists in session)
if (!req.session.user){
  return res.send('You are not logged in');
  
}


  // Get the new information from the form submission
  const petID = req.body.pet_id;    
  const petName = req.body.pet_name;
  const petType = req.body.pet_type;
  const petBreed = req.body.pet_breed;
  const petProfile = req.body.pet_profile;
  const petBio = req.body.pet_bio;
  
  //Check for existing petID
  let petCheckSQL = "SELECT * FROM pets_table WHERE pet_id = ?";
  let existingPet = await executeSQL(petCheckSQL, [petID]);

  if (existingPet.length > 0) {
    return res.send("Pet ID is already taken!");
  }

  // Insert the information into database table
  let sql = `INSERT INTO pets_table (pet_id, pet_name, pet_type, pet_breed, pet_bio, owner_id)
             VALUES (?,?,?,?,?,?,?)`;
  let values = [petID, petName, petType, petBreed, petBio, req.session.user.id];

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
    return res.send("Not logged in");
  }
  let petID = req.body.pet_id;
  const newName = req.body.new_pet_name;
  const newType = req.body.new_pet_type;
  const newBreed = req.body.new_pet_breed;
  const newProfPic = req.body.new_profile_image;
  const newBio = req.body.new_pet_bio;

  let sql = "UPDATE pets_table SET pet_name = ?, pet_type = ?, pet_breed = ?, profile_image = ?, pet_bio = ? WHERE pet_id = ?"
  let values = [newName,newType, newBreed, newProfPic, newBio, petID];

  try{
    await executeSQL(sql, values);
    res.redirect('petProfile?pet_id='+petID);
  } catch (error){
    return res.send('Error in updateing pet: ' + error.message);
  }

 });
//-------------POST Pet Owner Create Post Route----------------------
app.post('/createPost', async (req, res) => {
  // Check if user is logged in 
  if (!req.session.user){
    return res.render('home',{errorMessage: 'Need to log in first. '})

    // return res.send('Not logged in');
    
  }

  const postImage = req.body.posting_image;
  const postText = req.body.post_text;
  let pet = req.body.pet_petId;
  const visibility = req.body.post_visibility;

  // Insert the information
  let sql = `INSERT INTO posts_table (pet_owner_id,pet_owner_username, posting_image, post_text, post_visibility)
             VALUES (?,?,?,?,?)`;
  let values = [req.session.user.id, req.session.user.user_name, postImage, postText, visibility];
  
  // execute the query 
  try{
    data = await executeSQL(sql, values);

  } catch(error){
    // return res.send ('Error in creating post: ' + error.message);
    return res.render('createPost',{errorMessage: 'Error in creating post: '+ error.message})
  }
  const id = data.insertId;
  // check if pets were not tagged in post 
  if(!pet){
    return res.render('createPost',{successful: 'Created Post Succesfully!'})
    // return res.send('post created successfully!');
  }
  // if only one pet is selected, wont be an array type
  if(!Array.isArray(pet)){
    pet = [pet];
  }
  //Execute the 2nd query (multiple pet_ids from pet array)
  pet.forEach(async pet_id => {
    try{
      let sql2 = `INSERT INTO petsTaggedPosts_table (pet_owner_id, pet_id, post_id)
      VALUES (?,?,?)`;
      let values2 = [req.session.user.id, pet_id, id];
      await executeSQL(sql2, values2);
      return res.render('createPost',{successful: 'Created Post Succesfully!'})
      // res.send('post created successfully!');

    }catch(error){
      // return res.send ('Error in creating post: ' + error.message);
      return res.render('createPost',{errorMessage: 'Error in creating post: '+ error.message})
    }
    });
  
  });

// ----------POST  INITATE TRANSFER PET  route.----------------
// POST route for handling Initiate pet transfer
app.post('/IntitiateTransfer', async (req, res) => {
  const receivingUsername = req.body.username;
  const petName = req.body.petUserName;
  const sendingUser = req.session.user.user_name;

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
    let senderId = senderResult[0]?.id;
    let receiverId = receiverResult[0]?.id;
    let petId = petResult[0].id;
  
    // Insert into messages table
    let sql3 = `INSERT INTO messages (sender_id, receiver_id, message_content, is_transfer, pet_id)
                VALUES (?, ?, ?, ?, ?)`;
    let values3 = [senderId, receiverId, 'Transfer pet?', true, petId];
    await executeSQL(sql3, values3);
  
    // Render a success message or confirmation page
    res.send('Pet transfer initiated successfully' + "Send " + senderId + " rec " + receiverId );
  } catch (error) {
    return res.send('ERROR in Transfer ' + error.message);
  }
  
});

// ---------- Send message Post route.---------
app.post('/sendmessage', async (req, res) => {
   // Extract data from the request body
   const recipient_username = req.body.recipient;
   const message = req.body.message;

   console.log(" session : " + req.session.user.id);
    
   // Assuming you have session handling middleware to get the user ID
   const sender_id = req.body.sender_id;
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
       res.send("Message Sent");
   } catch (error) {
       // Handle errors appropriately, such as rendering an error page or sending an error response
       console.error("Error sending message:", error);
       res.status(500).send("Error sending message. Please try again later.");
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


// ===================================================================
// DATA BASE SET UP
// ===================================================================
//------------------Execute Sql----------------------------------
function executeSQL(sql, params) {
    return new Promise(function(resolve, reject) {
      pool.query(sql, params, function(err, rows, fields) {
        if (err) throw err;
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

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Paws server started on port: ${server.address().port}`);
});