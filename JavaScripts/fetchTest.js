const up_arrow = '<i class="fa-solid fa-arrow-up" style="font-size: large; color: #2b4d7d;"></i>'
const down_arrow = '<i class="fa-solid fa-arrow-down" style="font-size: large; color: #cd2435;"></i>'

fetch('https://raw.githubusercontent.com/EDCStanalytics/CruiseData/refs/heads/main/Cruise_Dummy_Data.csv')
  .then(response => {
    // Check if the request was successful (status code 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Parse the response body as JSON
    return response.text();
  })
  .then(data => {
    //this takes our data in string format and splits it into rows based on the presence of the carriage return character
    var dataRows = data.split('\n');
    dataRows.shift();

    //this is the first and last column number right?
    var topRows = dataRows.slice(0,11);

    //now i would like to create two tables from the data, one with data from the last 12 months, and one with data from the twelve months before that
    var firstCut = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    var secondCut = new Date(new Date().setFullYear(new Date().getFullYear() - 2))

    var year0 = dataRows.filter( function(string) {
        var callDate = new Date(string.split(',')[1]);
        return callDate >= firstCut;
    });

    var year1 = dataRows.filter( function(string) {
        var callDate = new Date(string.split(',')[1]);
        return  firstCut > callDate && callDate >= secondCut;
    });
   
    document.getElementById('callCount_number').innerText = year0.length + " Ship Calls";
    document.getElementById('callCount_yoy').innerText = Math.round((year0.length / year1.length) * 100) + "%";
    
    let kpi_icon_calls;

    if (year0.length > year1.length) {
        kpi_icon_calls = up_arrow;
    } else {
        kpi_icon_calls = down_arrow;
    };
    
    document.getElementById('callCount_kpi_icon').innerHTML = kpi_icon_calls;

    let paxCount0 = year0.reduce((paxCount, currentValue) => {
      return paxCount + Number(currentValue.split(',')[7]);
    }, 0);

    let paxCount1 = year1.reduce((paxCount, currentValue) => {
      return paxCount + Number(currentValue.split(',')[7]);
    }, 0);
    
    let kpi_icon_pax;

    if (paxCount0 > paxCount1) {
        kpi_icon_pax = up_arrow;
    } else {
        kpi_icon_pax = down_arrow;
    };

    document.getElementById('paxCount_number').innerText = numberCruncher(paxCount0) + " Passengers";
    //animateTextUpdate(document.getElementById('paxCount_number'), numberCruncher(paxCount0) + " Passengers");


    document.getElementById('paxCount_yoy').innerText = Math.round((paxCount0 / paxCount1) * 100) + "%";
    document.getElementById('paxCount_kpi_icon').innerHTML = kpi_icon_pax;


    let kWhCount0 = year0.reduce((paxCount, currentValue) => {
      return paxCount + Number(currentValue.split(',')[9]);
    }, 0);

    let kWhCount1 = year1.reduce((paxCount, currentValue) => {
      return paxCount + Number(currentValue.split(',')[9]);
    }, 0);

    let kpi_icon_kWh;

    if (kWhCount0 > kWhCount1) {
        kpi_icon_kWh = up_arrow;
    } else {
        kpi_icon_kWh = down_arrow;
    };


    document.getElementById('powerCount_number').innerText = numberCruncher(kWhCount0) + "  kWh";
    document.getElementById('powerCount_yoy').innerText = Math.round((kWhCount0 / kWhCount1) * 100) + "%";
    document.getElementById('powerCount_kpi_icon').innerHTML = kpi_icon_kWh;




    console.log(firstCut);
    console.log(secondCut);
    console.log(year0.length);
    console.log(year1.length);
    console.log(new Date(topRows.shift().split(',')[1]) < new Date());

    console.log(year0.reduce((paxCount, currentValue) => {
      return paxCount + Number(currentValue.split(',')[7]);
    }, 0)); // Process the fetched data
  })
  .catch(error => {
    console.error('Error fetching data:', error);
  });


  //this custom function will convert numbers that are annoying into something readable
function numberCruncher(number) {
  if (number < 1000) {
    return number.toString();
  } else if (number >= 1000 && number < 1_000_000) {
    return (number / 1000).toFixed(2).replace(/\.0$/, "") + "K";
  } else if (number >= 1_000_000 && number < 1_000_000_000) {
    return (number / 1_000_000).toFixed(2).replace(/\.0$/, "") + "M";
  } else if (number >= 1_000_000_000) {
    return (number / 1_000_000_000).toFixed(2).replace(/\.0$/, "") + "B";
  }
}

//trying to ease in the text kpis
function animateTextUpdate(selElement, newText) {
  selElement.style.opacity = 0;

  setTimeout(() => {
    selElement.innerText = newText;
    selElement.opacity = 1;
    console.log('updating text of ' + selElement.id)
  }, 500);
}