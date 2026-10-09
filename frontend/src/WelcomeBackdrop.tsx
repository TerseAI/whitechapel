import { useStory, storyImage } from './story/StoryProvider';
export function WelcomeBackdrop() {
  const story = useStory();
  const image = storyImage(story, story.cover);
  return image ? <img className="welcome-backdrop" src={image.src} alt=""/> : null;
}
