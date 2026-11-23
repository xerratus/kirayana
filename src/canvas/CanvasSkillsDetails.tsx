import { CanvasDetailList } from './CanvasDetailList'

export type SkillSummary = { id: string; command: string; name: string; description: string; category: string; project_id: string | null; enabled: boolean; built_in: boolean; version: number; updated_at: string }

export function CanvasSkillsDetails({ skills, selectedId, onSelect }: { skills: SkillSummary[]; selectedId?: string; onSelect: (id: string) => void }) {
  return <CanvasDetailList
    items={skills.map(skill => ({
      key: skill.id,
      label: skill.name,
      searchText: `${skill.name} ${skill.command} ${skill.description} ${skill.category}`,
      content: <><strong>{skill.name}</strong><small>/{skill.command} · {skill.description}</small></>,
    }))}
    label="skills"
    empty="No skills available."
    selectedId={selectedId}
    onSelect={onSelect}
  />
}
