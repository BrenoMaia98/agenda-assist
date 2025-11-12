import './App.css'
import PlayerSelectionModal from './components/PlayerSelectionModal'
import WeekCalendar from './components/WeekCalendar/WeekCalendar'
import { CalendarProvider, useCalendar } from './contexts/CalendarContext'

function AppContent() {
  const { showPlayerModal, setCurrentUser, currentUser } = useCalendar()

  return (
    <>
      {showPlayerModal && (
        <PlayerSelectionModal onPlayerSelect={setCurrentUser} currentUser={currentUser} />
      )}
      <div className="app">
        <WeekCalendar />
      </div>
    </>
  )
}

function App() {
  return (
    <CalendarProvider>
      <AppContent />
    </CalendarProvider>
  )
}

export default App
