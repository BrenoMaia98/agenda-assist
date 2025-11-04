import WeekCalendar from './WeekCalendar'
import '../i18n/config'

describe('WeekCalendar Component', () => {
  beforeEach(() => {
    cy.mount(<WeekCalendar />)
  })

  describe('Initial Render', () => {
    it('should render the calendar with all days', () => {
      cy.contains('Agendador de Sessões de RPG').should('be.visible')
      cy.contains('Domingo').should('be.visible')
      cy.contains('Segunda').should('be.visible')
      cy.contains('Sábado').should('be.visible')
    })

    it('should show player name input and session info', () => {
      cy.get('input[placeholder*="nome de jogador"]').should('be.visible')
      cy.contains(/Campanha.*D&D/i).should('be.visible')
      cy.contains('3 horas').should('be.visible')
    })

    it('should display language switcher', () => {
      cy.contains('button', 'EN').should('be.visible')
      cy.contains('button', 'PT').should('be.visible')
    })

    it('should show calendar overlay when player name is empty', () => {
      cy.contains(/insira seu nome de jogador/i).should('be.visible')
    })
  })

  describe('Player Name Validation', () => {
    it('should show required badge initially', () => {
      cy.contains('Obrigatório').should('be.visible')
    })

    it('should update badge as user types', () => {
      cy.get('input[placeholder*="nome de jogador"]').type('A')
      cy.contains('2 faltam').should('be.visible')
      
      cy.get('input[placeholder*="nome de jogador"]').type('B')
      cy.contains('1 faltam').should('be.visible')
      
      cy.get('input[placeholder*="nome de jogador"]').type('C')
      cy.contains(/faltam/).should('not.exist')
    })

    it('should remove overlay when valid name is entered', () => {
      cy.enterPlayerName('TestUser')
      cy.contains(/insira seu nome de jogador/i).should('not.exist')
    })
  })

  describe('Language Switching', () => {
    it('should switch to English', () => {
      cy.contains('button', 'EN').click()
      cy.contains('TTRPG Session Planner').should('be.visible')
      cy.contains('Sunday').should('be.visible')
    })

    it('should switch back to Portuguese', () => {
      cy.contains('button', 'EN').click()
      cy.contains('button', 'PT').click()
      cy.contains('Agendador de Sessões de RPG').should('be.visible')
      cy.contains('Domingo').should('be.visible')
    })
  })

  describe('Single Click - Create Session', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should create a session when clicking empty cell', () => {
      cy.get('.calendar-cell').first().click()
      cy.contains(/Campanha.*D&D/i).should('be.visible')
      cy.get('.calendar-event').should('have.length.at.least', 1)
    })

    it('should display session time range', () => {
      cy.get('.calendar-cell').eq(10).click()
      cy.get('.event-time').should('contain', '-')
    })

    it('should show translucent overlay on covered cells', () => {
      cy.get('.calendar-cell').first().click()
      cy.get('.cell-overlay').should('exist')
    })
  })

  describe('Single Click - Delete Session', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should delete session when clicking on existing session starting cell', () => {
      // Create session
      cy.get('.calendar-cell').eq(5).click()
      cy.get('.calendar-event').should('have.length.at.least', 1)
      
      // Delete session
      cy.get('.calendar-cell').eq(5).click()
      cy.get('.calendar-event').should('not.exist')
    })

    it('should toggle session on/off with multiple clicks', () => {
      const cell = cy.get('.calendar-cell').eq(8)
      
      // Create
      cell.click()
      cy.get('.calendar-event').should('exist')
      
      // Delete
      cell.click()
      cy.get('.calendar-event').should('not.exist')
      
      // Create again
      cell.click()
      cy.get('.calendar-event').should('exist')
    })
  })

  describe('Drag - Create Multiple Sessions', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should create multiple sessions when dragging vertically', () => {
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(1)
        .trigger('mouseenter')
      cy.get('.calendar-cell').eq(2)
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.at.least', 3)
    })

    it('should show drag preview while dragging', () => {
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(1)
        .trigger('mouseenter')
      
      cy.get('.drag-preview').should('exist')
      cy.get('.drag-overlay').should('exist')
    })

    it('should create sessions across multiple days', () => {
      // Drag from Sunday to Tuesday at same time
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(48) // Next day
        .trigger('mouseenter')
      cy.get('.calendar-cell').eq(96) // Third day
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.at.least', 3)
    })

    it('should create sessions with time range when dragging vertically and horizontally', () => {
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(2)
        .trigger('mouseenter')
      cy.get('.calendar-cell').eq(50) // Different day, different time
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.at.least', 6)
    })
  })

  describe('Drag - Delete Multiple Sessions', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should delete multiple sessions when dragging from existing session', () => {
      // Create multiple sessions
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(3)
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.at.least', 4)
      
      // Delete by dragging from existing
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(2)
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.lessThan', 4)
    })

    it('should delete all sessions in dragged range', () => {
      // Create sessions
      cy.get('.calendar-cell').eq(0).click()
      cy.get('.calendar-cell').eq(1).click()
      cy.get('.calendar-cell').eq(2).click()
      cy.get('.calendar-cell').eq(3).click()
      
      cy.get('.calendar-event').should('have.length', 4)
      
      // Delete range
      cy.get('.calendar-cell').eq(1)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(2)
        .trigger('mouseenter')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length', 2)
    })
  })

  describe('Mouse Interactions', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should cancel drag when mouse leaves calendar', () => {
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(1)
        .trigger('mouseenter')
      
      cy.get('.week-calendar').trigger('mouseleave')
      
      // Should not create sessions
      cy.get('.calendar-event').should('not.exist')
    })

    it('should handle mouse up outside drag area', () => {
      cy.get('.calendar-cell').eq(0)
        .trigger('mousedown')
      cy.get('.calendar-cell').eq(1)
        .trigger('mouseenter')
      cy.get('body').trigger('mouseup')
      
      cy.get('.calendar-event').should('have.length.at.least', 1)
    })
  })

  describe('Session Display', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should display session title', () => {
      cy.get('.calendar-cell').first().click()
      cy.get('.event-title').should('contain', 'Campanha')
    })

    it('should display session time range', () => {
      cy.get('.calendar-cell').eq(10).click()
      cy.get('.event-time').should('be.visible')
    })

    it('should show hover effect on events', () => {
      cy.get('.calendar-cell').first().click()
      cy.get('.calendar-event')
        .trigger('mouseenter')
        .should('have.css', 'transform')
    })
  })

  describe('Time Slots', () => {
    it('should display 30-minute time slots', () => {
      cy.get('.time-label').should('have.length.at.least', 48)
    })

    it('should show full hours with labels', () => {
      cy.contains('12:00 AM').should('be.visible')
      cy.contains('1:00 PM').should('be.visible')
    })

    it('should have half-hour cells with lighter borders', () => {
      cy.get('.calendar-cell.half-hour').should('exist')
    })
  })

  describe('Accessibility', () => {
    it('should prevent text selection during drag', () => {
      cy.get('.week-calendar').should('have.css', 'user-select', 'none')
    })

    it('should have proper cursor on calendar cells', () => {
      cy.get('.calendar-cell')
        .first()
        .should('have.css', 'cursor', 'pointer')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      cy.enterPlayerName('TestUser')
    })

    it('should handle rapid clicks', () => {
      const cell = cy.get('.calendar-cell').eq(5)
      cell.click()
      cell.click()
      cell.click()
      
      // Should toggle properly
      cy.get('.calendar-event').should('exist')
    })

    it('should handle drag from last time slot', () => {
      cy.get('.calendar-cell').last()
        .trigger('mousedown')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('exist')
    })

    it('should handle cross-day drag from end of week', () => {
      const lastDayCells = cy.get('.calendar-cell').filter((i) => i >= 288)
      lastDayCells.first()
        .trigger('mousedown')
        .trigger('mouseup')
      
      cy.get('.calendar-event').should('exist')
    })
  })
})

