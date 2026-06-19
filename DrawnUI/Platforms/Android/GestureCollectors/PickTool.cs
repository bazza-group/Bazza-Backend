using DrawnUi.Draw;
using SkiaSharp;

namespace DrawnUi;

partial class PickTool : IDrawnCanvas // making it static
{
    public static IDrawnCanvas Instance { get; protected set; }

    public SkiaControl Picked;

    public void OnPick<T>(SKPoint point, List<T> snapIntersectChildren)
        where T : SkiaControl
    {
        if (Instance == null)
            return;

        Instance.OnPick(point, snapIntersectChildren);
    }
}
