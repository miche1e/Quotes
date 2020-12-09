const express = require("express");
const admin = require("firebase-admin");
const firebase = require("firebase");
const serviceAccount = require("../serviceAccount.json");

const router = express.Router();

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAUnTB7bzy0ZQNJplLk3Jcl_4NGqk75X-A",
    authDomain: "digital-quotes-fd365.firebaseapp.com",
    projectId: "digital-quotes-fd365",
    storageBucket: "digital-quotes-fd365.appspot.com",
    messagingSenderId: "799639785474",
    appId: "1:799639785474:web:e86fd220ba1c36b2ac971b"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

quotes = [];
logged = false;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function genId() {
    return quotes.length > 0 ? Math.max(...quotes.map(quote => quote.id)) + 1 : 1
}

async function updateQuotes() {
    quotes.length = 0;
    const list = await db.collection("quotes").get();
    list.forEach(doc => quotes.push(doc.data()));
}

router.post("/login", async (req, res) => {
    try{
        if(!req.body.email){
            return res.status(400).send({error: "Bad request, missing mail field!"});
        }else if(!req.body.password){
            return res.status(400).send({error: "Bad request, missing the password field!"});
        }
        const user = await firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password);
        const token = await user.user.getIdToken();
        logged = true;
        return res.status(201).json({ token });
    }catch(error){
        return res.status(500).send({error: error.toString()});
    }
});

router.get("/quotes", async (req, res) => {
    try {
        await updateQuotes();
        return res.status(200).json(quotes);
    } catch (error) {
        return res.status(500).send(error);
    }
});

router.get("/quotes/:id", async (req, res) => {
    try {
        const quote = await db.collection('quotes').doc(req.params.id).get();
        if (!quote.data()) {
            return res.status(404).json({message: "Quote not found"});
        }
        return res.status(200).json(quote.data());
    } catch (error) {
        return res.status(500).send(error);
    }
});

router.post("/quotes", async (req, res) => {
    try {
        if(!logged){
            return res.status(400).send({error: "Unauthorized, you must log in for this action!"});
        }
        await updateQuotes();
        if (!req.body.author || !req.body.quote) {
            return res.status(400).send({error: "Unauthorized, you must log in for this action!"});
        }
        const newId = genId();
        let newQuote = {
            id: newId,
            quote: req.body.quote,
            author: req.body.author
        }
        db.collection('quotes').doc(newId.toString()).set(newQuote);
        return res.status(201).json({message: "Created"});
    } catch (error) {
        return res.status(500).send({error: error.toString()});
    }
});

router.patch("/quotes/:id", async (req, res) => {
    try {
        if(!logged){
            return res.status(400).send({error: "Unauthorized, you must log in for this action!"});
        }
        quotes.length = 0;
        const list = await db.collection("quotes").get();
        list.forEach(doc => quotes.push(doc.data()));

        if (!req.body.quote && !req.body.author) {
            return res.status(400).json({message: "You have to pass a quote and/or an author :/"});
        }
        const q = await db.collection("quotes").doc(req.params.id).get();
        if (!q.data()) {
            return res.status(404).json({message: "Quote not found :("});
        }

        if (req.body.quote && req.body.author) {
            db.collection("quotes").doc(req.params.id).set({
                quote: req.body.quote,
                author: req.body.author
            }, {merge: true});
            return res.json({message: "Updated"});
        }
        if (req.body.quote) {
            db.collection("quotes").doc(req.params.id).set({quote: req.body.quote}, {merge: true});
            return res.json({message: "Updated"});
        }
        if (req.body.author) {
            db.collection("quotes").doc(req.params.id).set({author: req.body.author}, {merge: true});
            return res.json({message: "Updated"});
        }

    } catch (error) {
        return res.status(500).send(error);
    }
});

router.delete("/quotes/:id", async (req, res) => {
    try {
        if(!logged){
            return res.status(400).send({error: "Unauthorized, you must log in for this action!"});
        }

        const q = await db.collection('quotes').doc(req.params.id).get();
        if (!q.data()) {
            return res.status(404).json({message: "quote not found"});
        }


        db.collection("quotes").doc(req.params.id).delete();

        return res.status(200).json({message: "Deleted"});

    } catch (error) {
        return res.status(500).send(error);
    }
});

module.exports = router;
