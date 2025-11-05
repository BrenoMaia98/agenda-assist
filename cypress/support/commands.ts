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
  cy.get('input[placeholder*="nome de jogador"]').clear().type(name)
  cy.contains(/insira seu nome de jogador/i).should('not.exist')
  cy.wait(100) // Small wait to ensure state updates
})

Cypress.Commands.add('getCalendarCell', (dayIndex: number, timeSlot: number) => {
  cy.get('.calendar-cell').eq(dayIndex * 48 + timeSlot)
})

export {}

