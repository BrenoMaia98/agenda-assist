/// <reference types="cypress" />
import '../../../cypress/support/component'
import '../../i18n/config'
import WeekCalendar from './WeekCalendar'
import { TestWrapper, clearMockSessionsData } from '../../test/cypress-helpers'

describe('WeekCalendar Component', () => {
  beforeEach(() => {
    clearMockSessionsData()
    cy.mount(
      <TestWrapper>
        <WeekCalendar />
      </TestWrapper>
    )
  })

  describe('Initial Render', () => {
    it('should render the calendar with all days', () => {
      cy.contains('Agendador de Sessões de RPG').should('be.visible')
      cy.contains('Domingo').should('be.visible')
      cy.contains('Segunda').should('be.visible')
      cy.contains('Sábado').should('be.visible')
    })

    it('should show player select dropdown and session info', () => {
      cy.get('select#player-name').should('be.visible')
      cy.contains(/Campanha.*D&D/i).should('be.visible')
      cy.contains('3 horas').should('be.visible')
    })

    it('should display language switcher', () => {
      cy.contains('button', 'EN').should('be.visible')
      cy.contains('button', 'PT').should('be.visible')
    })

    it('should show calendar overlay when no player is selected', () => {
      cy.contains(/selecione seu jogador/i).should('be.visible')
    })
  })

  describe('Player Name Validation', () => {
    it('should show required badge initially', () => {
      cy.contains('Obrigatório').should('be.visible')
    })

    it('should hide badge when user selects a player', () => {
      cy.contains('Obrigatório').should('be.visible')

      cy.get('select#player-name').select('Nalu')
      cy.contains('Obrigatório').should('not.exist')

      cy.get('select#player-name').select('')
      cy.contains('Obrigatório').should('be.visible')
    })

    it('should remove overlay when a player is selected', () => {
      cy.enterPlayerName('Nalu')
      cy.contains(/selecione seu jogador/i).should('not.exist')
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
      cy.enterPlayerName('Breno (GM)')
    })

    it('should create a session when clicking empty cell', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.contains(/Campanha.*D&D/i).should('be.visible')
      cy.get('.calendar-event').should('have.length.at.least', 1)
    })

    it('should display session time range', () => {
      cy.get('.calendar-cell')
        .eq(10)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.event-time').should('contain', '-')
    })

    it('should show translucent overlay on covered cells', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.cell-overlay').should('exist')
    })
  })

  describe('Single Click - Delete Session', () => {
    beforeEach(() => {
      cy.enterPlayerName('Yshi')
    })

    it('should delete session when clicking on existing session starting cell', () => {
      // Create session
      cy.get('.calendar-cell')
        .eq(5)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)
      cy.get('.calendar-event').should('have.length.at.least', 1)

      // Delete session
      cy.get('.calendar-cell')
        .eq(5)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced delete to complete
      cy.wait(5500)
      cy.get('.calendar-event').should('not.exist')
    })

    it('should toggle session on/off with multiple clicks', () => {
      // Create
      cy.get('.calendar-cell')
        .eq(8)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')
      cy.wait(5500)
      cy.get('.calendar-event').should('exist')

      // Delete
      cy.get('.calendar-cell')
        .eq(8)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')
      cy.wait(5500)
      cy.get('.calendar-event').should('not.exist')

      // Create again
      cy.get('.calendar-cell')
        .eq(8)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')
      cy.wait(5500)
      cy.get('.calendar-event').should('exist')
    })
  })

  describe('Drag - Create Multiple Sessions', () => {
    beforeEach(() => {
      cy.enterPlayerName('Drefon')
    })

    it('should create multiple sessions when dragging vertically', () => {
      // Drag from cell 0 to cell 2 (3 time slots)
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      // Trigger mouseenter on intermediate cells
      cy.get('.calendar-cell')
        .eq(1)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)

      cy.get('.calendar-cell')
        .eq(2)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      // Should create 3 sessions (one for each time slot)
      cy.get('.calendar-event').should('have.length.at.least', 3)
    })

    it('should show drag preview while dragging', () => {
      cy.get('.calendar-cell').eq(0).scrollIntoView().trigger('mousedown')
      cy.get('.calendar-cell').eq(1).trigger('mouseenter')

      cy.get('.drag-preview').should('exist')
      cy.get('.drag-overlay').should('exist')
    })

    it('should create sessions across multiple days', () => {
      // Drag from Sunday (cell 0) to Tuesday (cell 96) at same time
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      // Next day (Monday at same time)
      cy.get('.calendar-cell')
        .eq(48)
        .scrollIntoView()
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)

      // Third day (Tuesday at same time)
      cy.get('.calendar-cell')
        .eq(96)
        .scrollIntoView()
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      // Should create 3 sessions (one for each day)
      cy.get('.calendar-event').should('have.length.at.least', 3)
    })

    it('should create sessions with time range when dragging vertically and horizontally', () => {
      // Drag from cell 0 (Sunday, first slot) through multiple cells
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      // Drag down 2 slots on same day
      cy.get('.calendar-cell')
        .eq(2)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)

      // Drag to different day (Monday, slot 2)
      cy.get('.calendar-cell')
        .eq(50)
        .scrollIntoView()
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      // Should create sessions spanning the dragged range
      // (3 time slots * 2 days = 6 sessions)
      cy.get('.calendar-event').should('have.length.at.least', 6)
    })
  })

  describe('Drag - Delete Multiple Sessions', () => {
    beforeEach(() => {
      cy.enterPlayerName('Frizon')
    })

    it('should delete multiple sessions when dragging from existing session', () => {
      // First, create multiple sessions by dragging
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      cy.get('.calendar-cell')
        .eq(3)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      // Verify sessions were created
      cy.get('.calendar-event').should('have.length.at.least', 4)

      // Now delete by dragging from existing session
      cy.wait(150)
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      cy.get('.calendar-cell')
        .eq(2)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for debounced delete to complete
      cy.wait(5500)

      // Should have deleted some sessions
      cy.get('.calendar-event').should('have.length.lessThan', 4)
    })

    it('should delete all sessions in dragged range', () => {
      // Create 4 individual sessions with single clicks
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown', { which: 1 })
        .trigger('mouseup')
        .wait(50)

      cy.get('.calendar-cell')
        .eq(1)
        .scrollIntoView()
        .trigger('mousedown', { which: 1 })
        .trigger('mouseup')
        .wait(50)

      cy.get('.calendar-cell')
        .eq(2)
        .scrollIntoView()
        .trigger('mousedown', { which: 1 })
        .trigger('mouseup')
        .wait(50)

      cy.get('.calendar-cell')
        .eq(3)
        .scrollIntoView()
        .trigger('mousedown', { which: 1 })
        .trigger('mouseup')
        .wait(50)

      // Wait for all creates to be saved
      cy.wait(5500)

      // Verify 4 sessions were created
      cy.get('.calendar-event').should('have.length', 4)

      // Delete the middle range (cells 1-2) by dragging
      cy.wait(150)
      cy.get('.calendar-cell')
        .eq(1)
        .scrollIntoView()
        .trigger('mousedown', { which: 1, buttons: 1 })
        .wait(10)

      cy.get('.calendar-cell')
        .eq(2)
        .trigger('mouseenter', { which: 1, buttons: 1 })
        .wait(10)
        .trigger('mouseup')

      // Wait for delete to be saved
      cy.wait(5500)

      // Should have 2 sessions left (cells 0 and 3)
      cy.get('.calendar-event').should('have.length', 2)
    })
  })

  describe('Mouse Interactions', () => {
    beforeEach(() => {
      cy.enterPlayerName('Tinga')
    })

    it('should cancel drag when mouse leaves calendar', () => {
      cy.get('.calendar-cell').eq(0).trigger('mousedown')
      cy.get('.calendar-cell').eq(1).trigger('mouseenter')

      cy.get('.week-calendar').trigger('mouseleave')

      // Should not create sessions
      cy.get('.calendar-event').should('not.exist')
    })

    it('should handle mouse up outside drag area', () => {
      cy.get('.calendar-cell').eq(0).trigger('mousedown')
      cy.get('.calendar-cell').eq(1).trigger('mouseenter')
      cy.get('body').trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.calendar-event').should('have.length.at.least', 1)
    })
  })

  describe('Session Display', () => {
    beforeEach(() => {
      cy.enterPlayerName('Zangs')
    })

    it('should display session title', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.player-name').should('contain', 'Campanha')
    })

    it('should display session time range', () => {
      cy.get('.calendar-cell')
        .eq(10)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.event-time').should('be.visible')
    })

    it('should show hover effect on events', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

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
      cy.contains('12:00 AM').scrollIntoView().should('be.visible')
      cy.contains('1:00 PM').scrollIntoView().should('be.visible')
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
      cy.get('.calendar-cell').first().should('have.css', 'cursor', 'pointer')
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      cy.enterPlayerName('Nalu')
    })

    it('should handle rapid clicks', () => {
      cy.get('.calendar-cell')
        .eq(5)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')
      cy.get('.calendar-cell')
        .eq(5)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')
      cy.get('.calendar-cell')
        .eq(5)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      // Should toggle properly (odd number of clicks = session exists)
      cy.get('.calendar-event').should('exist')
    })

    it('should handle drag from last time slot', () => {
      cy.get('.calendar-cell')
        .last()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.calendar-event').should('exist')
    })

    it('should handle cross-day drag from end of week', () => {
      cy.get('.calendar-cell')
        .eq(288)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for debounced save to complete
      cy.wait(5500)

      cy.get('.calendar-event').should('exist')
    })
  })

  describe('Debounced Save with Countdown Timer', () => {
    beforeEach(() => {
      cy.enterPlayerName('Breno (GM)')
    })

    it('should show countdown indicator after creating a session', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Countdown should appear immediately
      cy.contains(/salvando em 5s/i).should('be.visible')
    })

    it('should countdown from 5 to 1 seconds', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Check each countdown step
      cy.contains(/salvando em 5s/i).should('be.visible')
      cy.wait(1000)
      cy.contains(/salvando em 4s/i).should('be.visible')
      cy.wait(1000)
      cy.contains(/salvando em 3s/i).should('be.visible')
      cy.wait(1000)
      cy.contains(/salvando em 2s/i).should('be.visible')
      cy.wait(1000)
      cy.contains(/salvando em 1s/i).should('be.visible')
    })

    it('should show "Salvando..." when save begins', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      cy.contains(/salvando em 5s/i).should('be.visible')

      // Wait for countdown to complete
      cy.wait(5000)

      // Should show "Salvando..." during save
      cy.contains(/salvando\.\.\./i, { timeout: 1000 }).should('be.visible')
    })

    it('should show "Salvo" with checkmark after save completes', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for full save cycle
      cy.wait(5500)

      // Should show success message
      cy.contains(/salvo/i, { timeout: 2000 }).should('be.visible')
    })

    it('should hide "Salvo" message after 3 seconds', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for save to complete
      cy.wait(5500)
      cy.contains(/salvo/i).should('be.visible')

      // Wait for message to disappear
      cy.wait(3000)
      cy.contains(/salvo/i).should('not.exist')
    })

    it('should reset countdown when user makes another change', () => {
      // First change
      cy.get('.calendar-cell')
        .eq(0)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      cy.contains(/salvando em 5s/i).should('be.visible')

      // Wait 2 seconds
      cy.wait(2000)
      cy.contains(/salvando em 3s/i).should('be.visible')

      // Make another change - should reset to 5
      cy.get('.calendar-cell')
        .eq(1)
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      cy.contains(/salvando em 5s/i).should('be.visible')
    })

    it('should show green background for success state', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for save to complete
      cy.wait(5500)

      // Check for green gradient background (contains part of the green color value)
      cy.contains(/salvo/i)
        .parent()
        .should('have.css', 'background')
        .and('include', 'linear-gradient')
    })

    it('should show spinning loader during countdown and save', () => {
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Check spinner is visible during countdown
      cy.contains(/salvando em 5s/i)
        .parent()
        .find('div')
        .first()
        .should('have.css', 'animation')
    })
  })

  describe('View Mode Toggle', () => {
    beforeEach(() => {
      cy.enterPlayerName('Yshi')
    })

    it('should render view toggle buttons', () => {
      cy.contains('button', /minha disponibilidade/i).should('be.visible')
      cy.contains('button', /todos os jogadores/i).should('be.visible')
    })

    it('should start with "All Players" view active', () => {
      cy.contains('button', /todos os jogadores/i).should(
        'have.css',
        'font-weight',
        '700'
      ) // bold
    })

    it('should switch to personal view when clicked', () => {
      cy.contains('button', /minha disponibilidade/i).click()

      cy.contains('button', /minha disponibilidade/i).should(
        'have.css',
        'font-weight',
        '700'
      )
    })

    it('should switch back to all players view', () => {
      cy.contains('button', /minha disponibilidade/i).click()
      cy.contains('button', /todos os jogadores/i).click()

      cy.contains('button', /todos os jogadores/i).should(
        'have.css',
        'font-weight',
        '700'
      )
    })

    it('should maintain sessions when switching views', () => {
      // Create a session
      cy.get('.calendar-cell')
        .first()
        .scrollIntoView()
        .trigger('mousedown')
        .trigger('mouseup')

      // Wait for save indicator
      cy.contains(/salvando em/i).should('be.visible')

      // Switch views
      cy.contains('button', /minha disponibilidade/i).click()
      cy.contains('button', /todos os jogadores/i).click()

      // Session should still be there (or at least countdown indicator)
      cy.contains(/salvando em/i).should('be.visible')
    })
  })
})
