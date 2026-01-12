
  document.addEventListener('DOMContentLoaded', () => {
    const steps = [
      {
        target: '#download-combo',
        title: 'Welcome to the Portal',
        content: 'This title shows the currently selected dataset.',
        position: 'center',
        padding: 12
      },
      {
        target: '#navBarItems li:nth-child(1)',
        title: 'Summary Tab',
        content: 'Get a quick overview of key metrics here.',
        position: 'right'
      },
      {
        target: '#download-combo',
        title: 'Export Data',
        content: 'Click here to download combined Excel. Pro tip: use filters first!',
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
    // window.Tutorial.start(steps);

    // Example: tie to your help icon
    const helpBtn = document.getElementById('help-btn') || document.querySelector('.fa-circle-question');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => window.Tutorial.start(steps));
    }
  });

