import { createStore } from 'redux';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Record, Map as ImmutableMap, List } from 'immutable';
import { csvParse } from 'd3-dsv';
import page from 'page';

import {urls, COMPTE_ADMINISTRATIF, AGGREGATED_ATEMPORAL, AGGREGATED_TEMPORAL, CORRECTIONS_AGGREGATED} from './constants/resources';
import reducer from './reducer';

import csvStringToM52Instructions from '../../shared/js/finance/csvStringToM52Instructions.js';
import csvStringToCorrections from '../../shared/js/finance/csvStringToCorrections.js';
import {childToParent, elementById} from '../../shared/js/finance/flatHierarchicalById.js';

import Breadcrumb from '../../shared/js/components/gironde.fr/Breadcrumb';
import Home from './components/screens/Home';
import FinanceElement from './components/screens/FinanceElement';
import FocusSolidarity from './components/screens/FocusSolidarity';
import FocusInvestments from './components/screens/FocusInvestments';
import FocusPresence from './components/screens/FocusPresence';

import ExploreBudget from './components/screens/ExploreBudget';

import { HOME, SOLIDARITES, INVEST, PRESENCE } from './constants/pages';
import { 
    M52_INSTRUCTION_RECEIVED, CORRECTION_AGGREGATION_RECEIVED, 
    ATEMPORAL_TEXTS_RECEIVED, TEMPORAL_TEXTS_RECEIVED, 
    FINANCE_DETAIL_ID_CHANGE, 
} from './constants/actions'; 


const rubriqueIdToLabel = require('../../shared/js/finance/m52FonctionLabels.json');


/**
 * 
 * Initialize Redux store + React binding
 * 
 */
const REACT_CONTAINER_SELECTOR = '.cd33-finance-dataviz';
const CONTAINER_ELEMENT = document.querySelector(REACT_CONTAINER_SELECTOR);

/*
    Dirty (temporary) hacks to fix the gironde.fr pages so the content displays properly
*/
if(process.env.NODE_ENV === 'production'){
    const main = document.body.querySelector('main');
    const columnsEl = main.querySelector('.columns');
    const rowEl = main.querySelector('.row');

    const elementsToMove = main.querySelectorAll('.columns > :nth-child(-n+3)');

    Array.from(elementsToMove).forEach(e => {
        if(e.querySelector('h1')){
            // remove server-generated h1
            e.remove();
        }
        else{
            main.insertBefore(e, rowEl);
        }
    });

    main.insertBefore(CONTAINER_ELEMENT, rowEl);
}

// Breadcrumb
const BREADCRUMB_CONTAINER = process.env.NODE_ENV === "production" ?
    document.body.querySelector('.breadcrumb').parentNode :
    document.body.querySelector('nav');

const DEFAULT_BREADCRUMB = List([
    {
        text: 'Accueil',
        url: '/'
    },
    {
        text: 'Le Département',
        url: '/le-departement'
    },
    {
        text: `Un budget au service des solidarités humaine et territoriale`,
        url: '#'
    }
]);


const StoreRecord = Record({
    m52InstructionByYear: undefined,
    corrections: undefined,
    currentYear: undefined,
    explorationYear: undefined,
    // ImmutableMap<id, FinanceElementTextsRecord>
    textsById: undefined,
    financeDetailId: undefined,
    screenWidth: undefined
});

const store = createStore(
    reducer,
    new StoreRecord({
        m52InstructionByYear: new ImmutableMap(),
        currentYear: 2016,
        explorationYear: 2016,
        financeDetailId: undefined,
        textsById: ImmutableMap([[HOME, {label: 'Acceuil'}]]),
        screenWidth: window.innerWidth
    })
);



store.dispatch({
    type: ATEMPORAL_TEXTS_RECEIVED,
    textList: Object.keys(rubriqueIdToLabel)
        .map(fonction => ({
            id: `M52-DF-${fonction}`, 
            label: rubriqueIdToLabel[fonction]
        }))
});
store.dispatch({
    type: ATEMPORAL_TEXTS_RECEIVED,
    textList: Object.keys(rubriqueIdToLabel)
        .map(fonction => ({
            id: `M52-DI-${fonction}`, 
            label: rubriqueIdToLabel[fonction]
        }))
});



/**
 * 
 * Fetching initial data
 * 
 */
fetch(urls[CORRECTIONS_AGGREGATED]).then(resp => resp.text())
.then(csvStringToCorrections)
.then(corrections => {
    store.dispatch({
        type: CORRECTION_AGGREGATION_RECEIVED,
        corrections
    });
});

[ 2016, 2015, 2014, 2013, 2012 ]
.map(urls[COMPTE_ADMINISTRATIF])
.forEach(url => {
    fetch(url).then(resp => resp.text())
        .then(csvStringToM52Instructions)
        .then(m52Instruction => {
            store.dispatch({
                type: M52_INSTRUCTION_RECEIVED,
                m52Instruction,
            });
        });
});

fetch(urls[AGGREGATED_ATEMPORAL]).then(resp => resp.text())
.then(csvParse)
.then(textList => {
    store.dispatch({
        type: ATEMPORAL_TEXTS_RECEIVED,
        textList
    });
});

fetch(urls[AGGREGATED_TEMPORAL]).then(resp => resp.text())
.then(csvParse)
.then(textList => {
    store.dispatch({
        type: TEMPORAL_TEXTS_RECEIVED,
        textList
    });
});



/**
 * 
 * Routing
 * 
 */

page('/', () => {
    console.log('in route', '/')

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(Home)
        ),
        CONTAINER_ELEMENT
    );

    const breadcrumb = DEFAULT_BREADCRUMB;
    ReactDOM.render( React.createElement(Breadcrumb, { items: breadcrumb }), BREADCRUMB_CONTAINER );
});


page('/explorer', () => {
    console.log('in route', '/explorer');

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(ExploreBudget)
        ),
        CONTAINER_ELEMENT
    );


    const breadcrumb = DEFAULT_BREADCRUMB.push({text: 'Explorer'});
    ReactDOM.render( React.createElement(Breadcrumb, { items: breadcrumb }), BREADCRUMB_CONTAINER );
});


page('/finance-details/:contentId', ({params: {contentId}}) => {
    console.log('in route', '/finance-details', contentId)
    scrollTo(0, 0);

    store.dispatch({
        type: FINANCE_DETAIL_ID_CHANGE,
        financeDetailId: contentId
    })

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(FinanceElement)
        ),
        CONTAINER_ELEMENT
    );

    const breadcrumbData = [];

    let currentContentId = contentId.startsWith('M52-') ?
        contentId.slice(7) :
        contentId;

    while(currentContentId){
        if(currentContentId !== 'Total'){
            breadcrumbData.push({
                text: elementById.get(currentContentId).label,
                url: `#!/finance-details/${currentContentId}`
            })
        }
        currentContentId = childToParent.get(currentContentId);
    }

    breadcrumbData.push({
        text: 'Explorer',
        url: `#!/explorer`
    })
    
    const breadcrumb = DEFAULT_BREADCRUMB.concat(breadcrumbData.reverse());

    ReactDOM.render( React.createElement(Breadcrumb, { items: breadcrumb }), BREADCRUMB_CONTAINER );

});

page(`/focus/${SOLIDARITES}`, () => {
    console.log('in route', `/focus/${SOLIDARITES}`);
    scrollTo(0, 0);

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(FocusSolidarity)
        ),
        CONTAINER_ELEMENT
    );
});

page(`/focus/${INVEST}`, () => {
    console.log('in route', `/focus/${INVEST}`);
    scrollTo(0, 0);

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(FocusInvestments)
        ),
        CONTAINER_ELEMENT
    );
});

page(`/focus/${PRESENCE}`, () => {
    console.log('in route', `/focus/${PRESENCE}`);
    scrollTo(0, 0);

    ReactDOM.render(
        React.createElement(
            Provider,
            { store },
            React.createElement(FocusPresence)
        ),
        CONTAINER_ELEMENT
    );
});

page.redirect(location.pathname, '#!/')
page.redirect(location.pathname+'/', '#!/')

page.base(location.pathname);

page({ hashbang: true });
window.addEventListener('hashchange', () => {
    scrollTo(0, 0);
    page.redirect(location.hash); 
});
window.addEventListener('popstate', () => {
    scrollTo(0, 0);
    page.redirect(location.hash); 
});