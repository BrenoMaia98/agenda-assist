import './App.css'
import WeekCalendar from './components/WeekCalendar/WeekCalendar'
import { CalendarProvider } from './contexts/CalendarContext'

function App() {
  return (
    <CalendarProvider>
      <div className="app">
        <WeekCalendar />
      </div>
    </CalendarProvider>
  )
}

export default App
