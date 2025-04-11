// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, updateProfile, GoogleAuthProvider, signInWithPopup,  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";// TODO: Add SDKs for Firebase products that you want to use
import { getFirestore, doc, updateDoc, deleteDoc, collection, query, orderBy, limit, where, addDoc, serverTimestamp,  getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwBZtfruV_KFtQCQFB70jB6GpRzDoSCHM",
    authDomain: "moody-7b317.firebaseapp.com",
    projectId: "moody-7b317",
    storageBucket: "moody-7b317.firebasestorage.app",
    messagingSenderId: "1039085612693",
    appId: "1:1039085612693:web:6123ba7dd8c1aba773759c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

/* === States === */

let moodState = 0;
let collectionName = "posts";

/* === UI === */

/* == UI - Elements == */

const viewLoggedOut = document.getElementById("logged-out-view")
const viewLoggedIn = document.getElementById("logged-in-view")

const signInWithGoogleButtonEl = document.getElementById("sign-in-with-google-btn")

const emailInputEl = document.getElementById("email-input")
const passwordInputEl = document.getElementById("password-input")

const signInButtonEl = document.getElementById("sign-in-btn")
const signOutButtonEl = document.getElementById("sign-out-btn")
const createAccountButtonEl = document.getElementById("create-account-btn")

const userProfilePicture = document.getElementById("user-profile-picture");
const greetUserHeading = document.getElementById("user-greeting");

// const updateNameInputEl = document.getElementById("display-name-input")
// const updatePhoto = document.getElementById("photo-url-input");
// const updateProfileBtn = document.getElementById("update-profile-btn");

const textareaEl = document.getElementById("post-input")
const postButtonEl = document.getElementById("post-btn")
const moodEmojiEls = document.querySelectorAll(".mood-emoji-btn")

const allFilterButtonEl = document.getElementById("all-filter-btn")

const filterButtonEls = document.getElementsByClassName("filter-btn")

const postsEl = document.getElementById("posts")

/* == UI - Event Listeners == */

signInWithGoogleButtonEl.addEventListener("click", authSignInWithGoogle)

signInButtonEl.addEventListener("click", authSignInWithEmail)
signOutButtonEl.addEventListener("click", authSignOut)
createAccountButtonEl.addEventListener("click", authCreateAccountWithEmail)

// updateProfileBtn.addEventListener("click", authUpdateProfile);

for(let i = 0 ; i < moodEmojiEls.length ; i++) {
    moodEmojiEls[i].addEventListener("click", selectMood)
}

for (let filterButtonEl of filterButtonEls) {
    filterButtonEl.addEventListener("click", selectFilter)
}

postButtonEl.addEventListener("click", postButtonPressed);

/* === Main Code === */


/* === Functions === */

/* = Functions - Firebase - Authentication = */

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

onAuthStateChanged(auth, (user) => {
    if (user) {
        showLoggedInView();

        const photoURL = user.photoURL;
        const greetingName = user.displayName?.split(" ")[0] || "Friend";

        showProfilePicture(photoURL);
        greetUser(greetingName);
        
        // fetchInRealtimeAndRenderPostsFromDB(user);

    } else {
        showLoggedOutView();
    }
});


function authSignInWithGoogle() {
  signInWithPopup(auth, provider)
  .then((result) => {
    console.log("Signed In With Google");
  }).catch((error) => {
    console.error(error);  
  });
}

function authSignInWithEmail() {
    const email = emailInputEl.value;
    const password = passwordInputEl.value;

    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        clearAuthFields();
    })
    .catch((error) => {
        console.error(error);
    });
}

function authSignOut() {
    signOut(auth)
    .then(() => {
    })
    .catch((error) => {
        console.error(error);
    })
}

function authCreateAccountWithEmail() {
    const email = emailInputEl.value;
    const password = passwordInputEl.value;

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        // Signed up 
        clearAuthFields();
    })
    .catch((error) => {
        console.error(error);
    });
}

async function addPostToDb(postBody, user) {
    try {

        // to show break lines in post
        postBody = postBody.replace("\n", "<br/>")

        const docRef = await addDoc(collection(db, collectionName), {
            postBody, 
            userId: user.uid, 
            dateCreated: serverTimestamp(),
            mood: moodState,
        });
        console.log("Document written with ID: ", docRef.id);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
}

async function updatePostInDB(postId, postBody) {
    const postRef = doc(db, collectionName, postId);

    await updateDoc(postRef, {
        postBody,
    });
}

async function deletePostFromDB(postId) {
    await deleteDoc(doc(db, collectionName, postId));
}

function fetchInRealtimeAndRenderPostsFromDB(query) {
    onSnapshot(query, (querySnapshot) => {
        postsEl.innerHTML = "";

        querySnapshot.forEach((doc) => {
            renderPost(doc);
        })
    })
}

function fetchByDate(startDate, user) {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
        collection(db, collectionName),
        where("userId", "==", user.uid),
        where("dateCreated", ">=", startDate),
        where("dateCreated", "<=", endOfDay),
        orderBy("dateCreated", "desc")
    )

    fetchInRealtimeAndRenderPostsFromDB(q);
}

function fetchTodayPosts(user) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    fetchByDate(startOfDay, user);
}

function fetchWeekPosts(user) {
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)
    
    if (startOfWeek.getDay() === 0) { // If today is Sunday
        startOfWeek.setDate(startOfWeek.getDate() - 6) // Go to previous Monday
    } else {
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    }

    fetchByDate(startOfWeek, user);

}

function fetchMonthPosts(user) {
    const startOfMonth = new Date()
    startOfMonth.setHours(0, 0, 0, 0)
    startOfMonth.setDate(1)

    fetchByDate(startOfMonth, user);
}

function fetchAllPosts(user) {
    const q = query(
        collection(db, collectionName),
        where("userId", "==", user.uid),
        orderBy("dateCreated", "desc")
    )

    fetchInRealtimeAndRenderPostsFromDB(q);
}

// function authUpdateProfile() {
//     const displayName = updateNameInputEl.value;
//     const photoURL = updatePhoto.value;

//     if(displayName && photoURL) {
//         updateProfile(auth.currentUser, {
//             displayName: displayName, photoURL: photoURL
//         }).then(() => {
//             console.log("Profile Updated!");
//         }).catch((error) => {
//             console.error(error);
//         });
//     }
// }
/* == Functions - UI Functions == */

function createPostUpdateButton(doc) {
    const postData = doc.data();
    const postId = doc.id
    /* 
        <button class="edit-color">Edit</button>
    */
    const button = document.createElement("button")
    button.textContent = "Edit"
    button.classList.add("edit-color")
    button.addEventListener("click", function() {
        const newBody = prompt("Edit post", postData.postBody);

        if(newBody) {
            updatePostInDB(postId, newBody);
        }
    })
    
    return button
}

function createPostDeleteButton(doc) {
    const postId = doc.id
    
    /* 
        <button class="delete-color">Delete</button>
    */
    const button = document.createElement('button')
    button.textContent = 'Delete'
    button.classList.add("delete-color")
    button.addEventListener('click', function() {
        deletePostFromDB(postId)
    })
    return button
}

function createPostFooter(doc) {
    /* 
        <div class="footer">
            <button>Edit</button>
        </div>
    */
    const footerDiv = document.createElement("div")
    footerDiv.className = "footer"
    
    footerDiv.appendChild(createPostUpdateButton(doc))
    footerDiv.appendChild(createPostDeleteButton(doc))
    
    return footerDiv
}

function renderPost(doc) {
    const postData = doc.data();

    if(!postData.mood) return;

    const postDate = displayDate(postData.dateCreated);
    const mood = postData.mood;
    const postBody = postData.postBody;

    // post
    const post = document.createElement("div");
    post.classList.add("post");
    
    // post header 
    const header = document.createElement("div");
    header.classList.add("header");

    const date = document.createElement("h3");
    date.textContent = postDate;

    const moodImg = document.createElement("img");
    moodImg.src = `assets/emojis/${mood}.png`;

    header.append(date);
    header.append(moodImg);

    // post body
    const body = document.createElement("p");
    body.innerHTML = postBody;

    // add elements to post
    post.append(header);
    post.append(body);

    // add footer
    post.append(createPostFooter(doc));

    // render post
    postsEl.append(post);
}

function selectMood(event) {
    const selectedMoodEmojiElementId = event.currentTarget.id
    
    changeMoodsStyleAfterSelection(selectedMoodEmojiElementId, moodEmojiEls)
    
    const chosenMoodValue = returnMoodValueFromElementId(selectedMoodEmojiElementId)
    
    moodState = chosenMoodValue
}

function changeMoodsStyleAfterSelection(selectedMoodElementId, allMoodElements) {
    for (let moodEmojiEl of moodEmojiEls) {
        if (selectedMoodElementId === moodEmojiEl.id) {
            moodEmojiEl.classList.remove("unselected-emoji")          
            moodEmojiEl.classList.add("selected-emoji")
        } else {
            moodEmojiEl.classList.remove("selected-emoji")
            moodEmojiEl.classList.add("unselected-emoji")
        }
    }
}

function postButtonPressed() {
    const postBody = textareaEl.value;
    const user = auth.currentUser;

    if(postBody && moodState) {
        addPostToDb(postBody, user);
        textareaEl.value = "";
        resetAllMoodElements(moodEmojiEls);
    }
}

function showLoggedOutView() {
    hideView(viewLoggedIn)
    showView(viewLoggedOut)
}

function showLoggedInView() {
    hideView(viewLoggedOut)
    showView(viewLoggedIn)
}

function showView(view) {
    view.style.display = "flex"
}

function hideView(view) {
    view.style.display = "none"
}
function clearAuthFields() {
    emailInputEl.value = "";
    passwordInputEl.value = "";
}

function showProfilePicture(imgElement) {
    userProfilePicture.src = imgElement || "./assets/imgs/defaultImg.png";
}

function greetUser(userFirstName) {
    greetUserHeading.textContent = `Hey ${userFirstName}, how are you?`;
}

function resetAllMoodElements(allMoodElements) {
    for (let moodEmojiEl of allMoodElements) {
        moodEmojiEl.classList.remove("selected-emoji")
        moodEmojiEl.classList.remove("unselected-emoji")
    }
    
    moodState = 0
}

function returnMoodValueFromElementId(elementId) {
    return Number(elementId.slice(5))
}

function displayDate(firebaseDate) {
    if(!firebaseDate)
        return "Date Processing...";

    const date = firebaseDate.toDate()
    
    const day = date.getDate()
    const year = date.getFullYear()
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const month = monthNames[date.getMonth()]

    let hours = date.getHours()
    let minutes = date.getMinutes()
    hours = hours < 10 ? "0" + hours : hours
    minutes = minutes < 10 ? "0" + minutes : minutes

    return `${day} ${month} ${year} - ${hours}:${minutes}`
}

/* == Functions - UI Functions - Date Filters == */

function resetAllFilterButtons(allFilterButtons) {
    for (let filterButtonEl of allFilterButtons) {
        filterButtonEl.classList.remove("selected-filter")
    }
}

function updateFilterButtonStyle(element) {
    element.classList.add("selected-filter")
}

function selectFilter(event) {
    const user = auth.currentUser
    
    const selectedFilterElementId = event.target.id
    
    const selectedFilterPeriod = selectedFilterElementId.split("-")[0]
    
    const selectedFilterElement = document.getElementById(selectedFilterElementId)
    
    resetAllFilterButtons(filterButtonEls)
    
    updateFilterButtonStyle(selectedFilterElement)

    if(selectedFilterPeriod === "today") {
        fetchTodayPosts(user);
    }
    else if(selectedFilterPeriod === "week") {
        fetchWeekPosts(user);
    }
    else if(selectedFilterPeriod === "month") {
        fetchMonthPosts(user);
    }
    else if(selectedFilterPeriod === "all") {
        fetchAllPosts(user);
    }
}