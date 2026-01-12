
  document.addEventListener('DOMContentLoaded', () => {
    const steps = [
      {
        title: 'Welcome to the NYC Cruise Data Portal',
        content: 'This tutorial will provide a brief walkthrough of the dashboard. If this is not your first time visiting the website, please feel free to close out of this tutorial. Otherwise, click the "next" button or "right" arrow key to continue. Press "ESC" at any point to close the tutorial.',
        position: 'right',
        padding: 12
      },
      {

        title: 'Summary Tab',
        content: 'By default, the first page you will see is the Summary Tab. This tab provides a high level overview of activity over the last 12 completed months at the Brooklyn Cruise Terminal.',
        position: 'right',
        padding: 12
      },
      {
        title: 'Summary Tab',
        content: 'The dial to the left shows the total number of calls over the given time period.',
        position: 'right',
        padding: 12
      },
      {
        title: 'Summary Tab',
        content: 'The dial to the right shows the total number of shore power connections. We will dive deeper into Shore Power later on in the tutorial.',
        position: 'right',
        padding: 12
      },
      {
        title: 'Export Data',
        content: 'Use this button to download the underlying data as an Excel or a PDF.',
        position: 'right',
        padding: 12
      },
    /*  
    {
      target: '#download-combo',
      title: 'Export Data',
      content: 'Use this button to download the combined Excel file.',
      position: 'top-right',    // or use your centered mode if preferred
      radius: 12
      onEnter: () => {
        const btn = document.getElementById('download-combo');
        if (btn) {
          // Ensure it’s visible on screen before positioning
          btn.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
          // Show arrow below the button
          window.TutorialArrow.showBelow(btn, 'Export\nhere');
        }
      },
      onExit: () => {
        window.TutorialArrow.hide();
      }
    },
    */
      {

        title: 'Vessel Data',
        content: 'Clicking on the Calls dial will expand it to show the distribution of calls over the past 12 months. Hover over any golden bar for more information on the specific call like Date and Vessel.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Vessel Data',
        content: 'To return to the Summary Tab, click the center of the dial.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'Clicking on the Shore Power dial will expand it to show a few more stats related to Shore Power.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'Before we dive into the visuals, here is a brief explanation of Shore Power.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'Shore Power infrastructure is a widely used emissions mitigation technology in which ships connect to the local grid upon docking at a port. This allows vessels to turn off their diesel engines. ',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'The center gauge shows the usage of shore power over the past 12 months. This is the ratio of time connected to the time at dock. Since ships cannot be expected to connect immediately upon docking, 100% usage represents connecting and disconnecting within 90 minutes of arrival and departure.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'The dial to the left below the gauge will again show the total number of connections. The one to the right will show the total kWh used by the ships.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'Finally, the outer ring shows individual calls. The golden bar represents the time at dock and the thicker colored bars represent time connected, red being a poor connection, yellow an average connection and green a good connection. Exceptional connections are in blue.',
        position: 'top-right',
        radius: 12
      },
      {

        title: 'Shore Power Data',
        content: 'Clicking on one of the bars will pop-up a graph of all the calls related to that vessel.',
        position: 'top-right',
        radius: 12
      },
      {
        // Step without a specific target (e.g., final tip)
        title: 'You are all set!',
        content: 'Use the tabs to explore. Press Finish to close the tutorial.'
      }
    ];

    // Start on first visit or on demand:
     window.Tutorial.start(steps);

    // Example: tie to your help icon
    const helpBtn = document.getElementById('help-btn') || document.querySelector('.fa-circle-question');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => window.Tutorial.start(steps));
    }
  });

