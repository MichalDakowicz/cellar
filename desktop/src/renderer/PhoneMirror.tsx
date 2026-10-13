import { Archive } from "lucide-react";

export function PhoneMirror({
  width = 300,
  driving = true,
}: {
  width?: number;
  driving?: boolean;
}) {
  return (
    <div
      className="phone-mirror-frame"
      style={{ width, height: (width * 640) / 300 }}
      aria-label="sample phone screen"
    >
      <div
        className="drawn-phone"
        style={{ transform: `scale(${width / 300})` }}
      >
        {driving && (
          <div className="phone-driving">claude is driving · sample</div>
        )}
        <h2>inbox</h2>
        <small className="overline">to file · 4</small>
        <div className="phone-swipe">
          <div className="phone-archive">
            <Archive size={16} />
            archive
          </div>
          <article>
            <strong>archive needs an undo</strong>
            <small>idea · 3h ago</small>
          </article>
          {driving && <span className="sample-touch" />}
        </div>
        <article>
          <strong>streak pill clips on small phones</strong>
          <small>glitch · yesterday</small>
        </article>
        <article>
          <strong>rename shelves to rooms?</strong>
          <small>question · 2d ago</small>
        </article>
        <article>
          <strong>copy for the empty desk</strong>
          <small>copy · 2d ago</small>
        </article>
        <div className="phone-toast">
          archived <strong>undo</strong>
        </div>
        <div className="drawn-islands">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
