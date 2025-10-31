//this script is for taking in data in a csv file


//here is a link to the video walkthrough of this setup
//https://www.youtube.com/watch?v=oencyPPBTUQ

(function() {
    var DELIMITER = ',';
    var NEWLINE = '\n';
    var i = document.getElementById('file');
    //var i = 'https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Dummy_data_cruise_GH2.csv';
    var table = document.getElementById('table');

    if (!i) {
        console.log('ruh roh');
        return;
    }

    i.addEventListener('change', function(){
        if  (!!i.files && i.files.length > 0) {
            parseCSV(i.files[0]);
        }
    });

    function parseCSV(file) {
        if (!file || !FileReader) {
            console.log('ruh roh');
        return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
            toTable(e.target.result);
        };

        reader.readAsText(file);
    }

    function toTable(text) {
        if (!text || !table) {
            console.log('ruh roh');
        return;
        }

        //clear table
        while (!!table.lastElementChild) {
            table.removeChild(table.lastElementChild);
        }

        var rows = text.split(NEWLINE);
        var headers = rows.shift().trim().split(DELIMITER);
        var htr = document.createElement('tr');

        headers.forEach(function (h) {
            var th = document.createElement('th');
            var ht = h.trim();

            if (!ht) {
                console.log('ruh roh');
        return;
            }

            th.textContent = ht;
            htr.appendChild(th);
        });

        table.appendChild(htr);

        var rtr;

        rows.forEach(function (r) {
            r = r.trim();

            if (!r) {
                console.log('ruh roh');
        return;
            }

            var cols = r.split(DELIMITER);

            if (cols.length === 0) {
                console.log('ruh roh');
        return;
            }

            rtr = document.createElement('tr');

            cols.forEach(function (c) {
                var td = document.createElement('td');
                var tc = c.trim();

                td.textContent = tc;
                rtr.appendChild(td);

            });

            table.appendChild(rtr);
        }
        
    );
    }


})();

// Await keyword can only be used inside an async function.
async function setVariableWithFileContent() {
  try {
    // 1. Fetch the file from the server.
    const response = await fetch('../Data/Boats.csv');
    
    // Check if the request was successful.
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 2. Read the response as a text string.
    const fileContent = await response.text();
    
    // 3. Assign the file content to a variable.
    const myVariable = fileContent;
    
    // You can now use the `myVariable`.
    console.log("Variable assigned successfully:", myVariable);

  } catch (error) {
    console.error("Failed to fetch the file:", error);
  }
}

// Call the function to run the code.
setVariableWithFileContent();