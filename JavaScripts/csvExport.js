const APP = {

    data: [],
    init() {
        APP.addlisteners();

        //here we are trying to dynamically populate the header row based on the name of the inputs
        const header_row = document.getElementsByTagName('input');
        const arrHeaders = Array.from(header_row).map(Element => Element.name).filter(element => element);
        APP.data.unshift(arrHeaders);
        console.table(APP.data);
    },

    addlisteners() {
        const form = document.querySelector('#registration_form');
        form.addEventListener('submit', APP.saveData);

        //document
        //    .getElementById('btnExport')
        //    .addEventListener('click', APP.exportData);

    },

    saveData(ev) {
        ev.preventDefault();
        const form = ev.target;
        const formdata = new FormData(form);

        //you have the data, now you need to save it
        APP.cacheData(formdata);

        //this builds a row in the table

        //reset the form
        form.reset();

        //set focus back to first name
        document.getElementById('in_Pass').focus();

        //trigger the data export
        APP.exportData();
    },

    cacheData(formdata) {
        APP.data.push(Array.from(formdata.values()));
        console.table(APP.data)
    },

    exportData() {
        let str = '';
        APP.data.forEach((row)=> {
            str += row.map((col)=>JSON.stringify(col)).join(',').concat('\n')
        });

        console.log(str)

        let filename = `dataExport.${Date.now()}.csv`;
        let file = new File([str], filename, {type: 'text.csv'});

        let a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = filename;
        //a.click();

        let b = document.createElement('a');
        const receiver = 'jwilde@edc.nyc';
        const subject = "CSV Data Report Test";
        const body = "Please find the attached CSV Test";
        
        //const mailtoLink = `mailto:${receiver}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&attachment=${encodeURIComponent('test.csv')}&data=text/csv;charset=utf-8,${encodeURIComponent(str)}`;

        const mailtoLink = `mailto:jwilde@edc.nyc?subject=Your Table Data&body=${str}`;
        b.href = mailtoLink;
        b.click();
    }

}


document.addEventListener('DOMContentLoaded', APP.init);