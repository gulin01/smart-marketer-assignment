export default function FormNotFound() {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-6 py-20">
      <div className="max-w-sm text-center">
        <p className="text-xs font-medium tracking-[0.08em] text-ink-3 uppercase">404</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">
          이 폼을 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-3">
          링크가 잘못되었거나, 폼이 더 이상 응답을 받지 않습니다. 링크를 공유한 곳에서 최신 주소를
          확인해 주세요.
        </p>
      </div>
    </main>
  );
}
