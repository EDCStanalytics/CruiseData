//we need a function that highlights the selected nav bar item
let nav_Bar_Selected = function(itemIndex) {
    nb_UnSelect(selected_navItem);
    selected_navItem = itemIndex;
    nb_cardSwitch(selected_navItem);
    navItems[itemIndex].setAttribute('class', 'selectedNavItem');
}

//we might need a function that sets the un-selected nav bar item back to its default style
let nb_UnSelect = function(itemIndex) {
    //navItems[itemIndex].removeAttribute('style');
    navItems[itemIndex].removeAttribute('class');
}

//i think this is how you make the cards react to the user selection
let nb_cardSwitch = function(menuItem) {
    if (selected_navItem === 0 ) {
        console.log("Looks like you want to see the summary");
        cardItems.forEach(element => {
            element.removeAttribute('style');
        });
        document.querySelectorAll('.block').forEach(element => {
            element.removeAttribute('style');
        });
        //eraseDivs();
        
    } else if (selected_navItem === 1) {
        console.log("Looks like you want to see the call data");
        Object.assign(cardItems[0].style, focused_style);
        Object.assign(cardItems[1].style, exitRight_style);
        Object.assign(cardItems[2].style, exitRight_style);
        let myCards = Array.from(cardItems[0].querySelectorAll('.block'));
        myCards.forEach(element => {Object.assign(element.style,style_card_open);});
    } else if (selected_navItem === 2) {
        console.log("Looks like you want to see the pax data");
        Object.assign(cardItems[0].style, exitLeft_style);
        Object.assign(cardItems[1].style, focused_style);
        Object.assign(cardItems[2].style, exitRight_style);
        let myCards = Array.from(cardItems[1].querySelectorAll('.block'));
        myCards.forEach(element => {Object.assign(element.style,style_card_open);});
    } else if (selected_navItem === 3) {
        console.log("Looks like you want to see the shorepower data");
        Object.assign(cardItems[0].style, exitLeft_style);
        Object.assign(cardItems[1].style, exitLeft_style);
        Object.assign(cardItems[2].style, focused_style);
        let myCards = Array.from(cardItems[2].querySelectorAll('.block'));
        myCards.forEach(element => {Object.assign(element.style,style_card_open);});
    }
}

//i'd like the user to be able to do a little bit of navigation with the keyboard as well
let nb_incrementalSelect = function(up) {
    if (selected_navItem === navItems.length - 1 && up) {
        console.log("Final element was reached")
    } else if (selected_navItem === 0 && !up) {
        console.log('First Element was reached');
    } else if (up) {
        nav_Bar_Selected(selected_navItem + 1);
    } else {
        nav_Bar_Selected(selected_navItem - 1);
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowRight') {
        nb_incrementalSelect(true);
    } 
    else if (event.key ==='ArrowLeft') {
        nb_incrementalSelect(false);
    }
});


//get header li elements
try {
    var navItems = document.querySelectorAll("#navBarItems li");

    if (navItems.length > 0) {
        navItems.forEach((btn, index) => {
            btn.addEventListener('click', () => nav_Bar_Selected(index))
        });
    };

} catch (error) {
    console.error("Error:", error.message);
}


const cardItems = document.querySelectorAll(".report_card");

const focused_style = {
    left: 'calc(100%/6 * 1 - 14%)',
    opacity: '1',
    width: 'calc(100% - calc(100%/6 * 1 - 14%)*2)'
}

const exitLeft_style = {
    left: '-200%',
    opacity: '0',
    width: ''
}

const exitRight_style = {
    left: '200%',
    opacity: '0',
    width: ''
}

const style_card_open = {
    width: '30%',
    opacity: '1'
}


let selected_navItem = 0;
nav_Bar_Selected(selected_navItem);

//to insert additional charts on the different views we need to insert objects
function insertDivs() {
    const newDiv = document.createElement('div');
        newDiv.textContent = "New Div";
        
        newDiv.classList.add('tempClass');

    document.getElementById('testBox').prepend(newDiv);
    document.getElementById('testBox').appendChild(newDiv.cloneNode(true));
};

function eraseDivs() {
    const targets = Array.from(document.getElementsByClassName('tempClass'));

    if (targets.length >0) {
            targets.forEach(element => {
                element.remove();
            }
        )
    }
}
    

