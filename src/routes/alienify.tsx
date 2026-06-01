import { createFileRoute } from '@tanstack/react-router'
import { PhotoUploader } from '../components/PhotoUploader'

export const Route = createFileRoute('/alienify')({
  component: () => <PhotoUploader alienify={true} />,
})
