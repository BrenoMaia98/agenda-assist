import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../LanguageSwitcher'
import './PlayerSelectionModal.css'

interface PlayerSelectionModalProps {
  onPlayerSelect: (playerName: string) => void
  currentUser?: string
}

const PLAYERS = [
  'Breno(GM)',
  'Nalu',
  'Yshi',
  'Drefon',
  'Frizon',
  'Tinga',
  'Zangs',
]

const PlayerSelectionModal = ({ onPlayerSelect, currentUser = '' }: PlayerSelectionModalProps) => {
  const { t } = useTranslation()
  const [selectedPlayer, setSelectedPlayer] = useState(currentUser)

  const handleConfirm = () => {
    if (selectedPlayer) {
      onPlayerSelect(selectedPlayer)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-language-switcher">
          <LanguageSwitcher />
        </div>
        
        <h2 className="modal-title">{t('playerModal.title')}</h2>
        <p className="modal-description">{t('playerModal.description')}</p>
        
        <div className="modal-player-selector">
          <select
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
            className="modal-select"
          >
            <option value="">{t('player.placeholder')}</option>
            {PLAYERS.map(player => (
              <option key={player} value={player}>
                {player}
              </option>
            ))}
          </select>
        </div>

        <button
          className="modal-confirm-button"
          onClick={handleConfirm}
          disabled={!selectedPlayer}
        >
          {t('playerModal.confirmButton')}
        </button>
      </div>
    </div>
  )
}

export default PlayerSelectionModal

