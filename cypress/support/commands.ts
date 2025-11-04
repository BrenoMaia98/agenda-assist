/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to enter player name
       */
      enterPlayerName(name: string): Chainable<void>
      
      /**
       * Custom command to get calendar cell
       */
      getCalendarCell(dayIndex: number, timeSlot: number): Chainable<JQuery<HTMLElement>>
    }
  }
}

Cypress.Commands.add('enterPlayerName', (name: string) => {
  cy.get('input[placeholder*="nome de jogador"]').type(name)
})

Cypress.Commands.add('getCalendarCell', (dayIndex: number, timeSlot: number) => {
  cy.get('.calendar-cell').eq(dayIndex * 48 + timeSlot)
})

export {}

