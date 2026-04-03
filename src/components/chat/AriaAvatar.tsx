import AriaSparkleIcon from '../AriaSparkleIcon';

interface Props {
  size?: number;
}

/** Aria gradient avatar — violet→cyan circle with 3 sparkle shapes. */
export default function AriaAvatar({ size = 36 }: Props) {
  return <AriaSparkleIcon size={size} />;
}
