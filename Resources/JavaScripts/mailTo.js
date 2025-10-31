

// action="mailto:jwilde@edc.nyc?subject" method="post" enctype="text/plain"

const APP = {
    init() {
    console.log('I am connected');

    const receiver = 'jwilde@edc.nyc';
    const mailSubject = 'Registration Form Data';
    const mailBody = `Here is the registration data: \n`;
    
    const myForm = document.getElementById('registration_form');

    myForm.action = `mailto:${receiver}?subject=${mailSubject}&body=Testing`;
    myForm.method = 'post'
    myForm.enctype= "text/plain"

    }


}

document.addEventListener('DOMContentLoaded', APP.init);