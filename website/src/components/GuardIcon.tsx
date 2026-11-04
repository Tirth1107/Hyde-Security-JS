import {
  FileCode2, CreditCard, Network, ClipboardX, Bot, Fish, MessageSquareLock, Dna,
  Type, KeyRound, Gauge, RadioTower, Siren
} from 'lucide-react'
import type { GuardIcon as Name } from '../content'

const MAP = {
  script: FileCode2, card: CreditCard, network: Network, clipboard: ClipboardX, bot: Bot,
  fish: Fish, message: MessageSquareLock, dna: Dna, type: Type, key: KeyRound,
  gauge: Gauge, radio: RadioTower, siren: Siren
}

export function GuardIcon({ name, size = 20 }: { name: Name; size?: number }) {
  const Icon = MAP[name]
  return <Icon size={size} aria-hidden="true" />
}
