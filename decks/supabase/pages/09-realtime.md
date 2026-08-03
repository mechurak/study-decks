---
layout: section
---

# 9. Realtime

실시간은 하나가 아니라 셋이다

---

## Realtime의 세 가지 기능

| 기능 | 하는 일 | 대표 용례 |
|---|---|---|
| **Broadcast** | 클라이언트끼리 임의 메시지 전달 | 커서 위치, 타이핑 표시, 알림 |
| **Presence** | 채널 참여자의 상태 공유 | 접속자 목록, 온라인 표시 |
| **Postgres Changes** | DB 변경을 구독 | 데이터 자동 갱신 |

<v-clicks>

- 셋 다 **채널(channel)** 이라는 같은 추상 위에서 동작한다
- 흔한 오해: "실시간 = Postgres Changes". **실제로는 Broadcast가 더 자주 정답이다**
- Postgres Changes는 편하지만 **확장성 한계가 뚜렷하다** (뒤에서 상세히)

</v-clicks>

---

## 채널이라는 공통 추상

```ts
// 채널 = 클라이언트들이 모이는 방
const channel = supabase.channel('room-1')

channel
  .on('broadcast', { event: 'cursor' }, payload => { /* ... */ })
  .on('presence', { event: 'sync' }, () => { /* ... */ })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      payload => { /* ... */ })
  .subscribe((status) => {
    // 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
  })

// 정리 — 컴포넌트 언마운트 시 반드시
supabase.removeChannel(channel)
```

<v-clicks>

- 하나의 채널에 여러 리스너를 붙일 수 있다
- **`removeChannel`을 빠뜨리면 구독이 누적된다** — React StrictMode에서 특히 잘 드러난다
- 채널 이름으로 `'realtime'`은 쓸 수 없다 (예약어)

</v-clicks>

---

## Broadcast 기초

DB를 거치지 않고 클라이언트끼리 직접 메시지를 주고받는다.

```ts
const channel = supabase.channel('room-1')

// 수신
channel
  .on('broadcast', { event: 'cursor' }, ({ payload }) => {
    drawCursor(payload.userId, payload.x, payload.y)
  })
  .subscribe(status => {
    if (status !== 'SUBSCRIBED') return
    // 송신 (구독 후에는 WebSocket으로 전송)
    channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: me.id, x: 100, y: 200 },
    })
  })
```

<v-clicks>

- **DB에 저장되지 않는다** → 가장 빠르고 가장 저렴하다
- 저장이 필요하면 저장은 별도로 하고, 알림만 Broadcast로 보낸다
- 커서, 마우스 이동처럼 **초당 수십 건**이 오가는 데이터에 적합하다

</v-clicks>

---

## Broadcast — self / ack / HTTP 전송

```ts
// 내가 보낸 메시지도 내가 받기
const c1 = supabase.channel('room-2', { config: { broadcast: { self: true } } })

// 서버 수신 확인 후 Promise resolve
const c2 = supabase.channel('room-3', { config: { broadcast: { ack: true } } })
c2.subscribe(async status => {
  if (status !== 'SUBSCRIBED') return
  const res = await c2.send({ type: 'broadcast', event: 'ping', payload: {} })
  console.log(res)   // 'ok'
})
```

```ts
// 구독 없이 HTTP로 한 방 보내기 (서버 코드에서 유용)
const channel = supabase.channel('notifications')
await channel.httpSend('new-order', { orderId: 123 })
supabase.removeChannel(channel)
```

<v-click>

`httpSend`는 WebSocket 연결을 맺지 않는다. **서버리스 함수에서 알림만 쏘고 끝낼 때** 적합하다.
REST 엔드포인트(`/realtime/v1/api/broadcast/...`)로 직접 호출할 수도 있다.

</v-click>

---

## Presence

"지금 이 방에 누가 있는가"

```ts
const channel = supabase.channel('room-1', {
  config: { presence: { key: user.id } },
})

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // { 'user-1': [{ name: '앨리스', online_at: '...' }], ... }
    setOnlineUsers(Object.keys(state))
  })
  .on('presence', { event: 'join' }, ({ newPresences }) => { /* 입장 */ })
  .on('presence', { event: 'leave' }, ({ leftPresences }) => { /* 퇴장 */ })
  .subscribe(async status => {
    if (status !== 'SUBSCRIBED') return
    await channel.track({ name: user.name, online_at: new Date().toISOString() })
  })
```

<v-clicks>

- 연결이 끊기면 **자동으로 leave 처리**된다 — 직접 관리할 필요가 없다
- 상태는 서버 메모리에 있고 DB에 저장되지 않는다
- 참여자가 많은 채널에서는 동기화 트래픽이 커진다 — 수백 명 이상이면 설계를 재검토

</v-clicks>

---

## Postgres Changes 설정

DB 변경을 밀어주려면 **먼저 publication에 테이블을 등록**해야 한다.

```sql
-- 이 한 줄이 없으면 아무 이벤트도 오지 않는다
alter publication supabase_realtime add table public.messages;

-- UPDATE/DELETE에서 이전 값(old record)까지 받고 싶다면
alter table public.messages replica identity full;
```

<v-clicks>

- 대시보드 **Database → Publications** 에서 토글로도 가능하다
- **"구독은 되는데 이벤트가 안 와요"의 1순위 원인**이 이 설정 누락이다
- `replica identity full`은 WAL 크기를 키운다. 정말 필요할 때만 켠다

</v-clicks>

---

## Postgres Changes 구독과 필터

```ts
supabase
  .channel('room-messages')
  .on('postgres_changes', {
    event: 'INSERT',                      // 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    schema: 'public',
    table: 'messages',
    filter: 'room_id=eq.42',              // 서버 측 필터 — 불필요한 트래픽 차단
    select: ['id', 'body', 'user_id'],    // 전송할 컬럼 축소 (PK는 항상 포함)
  }, ({ eventType, new: newRow, old: oldRow }) => {
    if (eventType === 'INSERT') appendMessage(newRow)
  })
  .subscribe()
```

<v-clicks>

- 필터 연산자: `eq` `neq` `lt` `lte` `gt` `gte` `in` `like` `ilike` `match` `is` 등
- `not.` 접두사로 부정, 쉼표로 AND 결합 — `'amount=gt.100,status=eq.open'`
- **DELETE 이벤트는 필터할 수 없다** (Postgres가 삭제된 행의 값을 제공하지 않음)

</v-clicks>

---

## Postgres Changes와 RLS

<v-clicks>

- **RLS가 그대로 적용된다.** 구독했다고 다 보이는 게 아니다
- 구독하려면 해당 역할에 `select` 권한과 정책이 있어야 한다

```sql
alter table public.messages enable row level security;

create policy "방 참여자만 조회"
  on public.messages for select to authenticated
  using ( room_id in (
    select room_id from public.room_members where user_id = (select auth.uid())
  ) );

grant select on public.messages to authenticated;
```

</v-clicks>

<v-click>

**중요한 예외:** 공식 문서에 따르면 **DELETE에는 RLS가 적용되지 않는다.**
삭제된 행에 접근 권한이 있었는지 확인할 방법이 없기 때문이다.
RLS가 켜져 있고 `replica identity full`이면 DELETE의 old record에는 **기본 키만** 담긴다.

</v-click>

---
class: denser
---

## Broadcast from Database — 두 방식의 장점 합치기

DB 변경을 트리거로 감지해서 **Broadcast로** 내보낸다.

```sql {1-14|16-18|all}
create or replace function public.messages_changed()
returns trigger
security definer set search_path = ''
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    'room:' || coalesce(new.room_id, old.room_id)::text,  -- topic
    tg_op, tg_op,                                         -- event, operation
    tg_table_name, tg_table_schema,
    new, old
  );
  return null;
end;
$$;

create trigger messages_broadcast
  after insert or update or delete on public.messages
  for each row execute function public.messages_changed();
```

```ts
supabase.channel(`room:42`, { config: { private: true } })
  .on('broadcast', { event: 'INSERT' }, ({ payload }) => append(payload.record))
  .subscribe()
```

---

## 무엇을 언제 쓰나 — 선택 가이드

```mermaid {scale: 0.62}
flowchart TD
    Q1{"DB에 저장되는<br/>데이터의 변경인가?"}
    Q1 -->|아니오| B1["Broadcast<br/>(커서, 타이핑, 임시 알림)"]
    Q1 -->|예| Q2{"동시 구독자가<br/>수천 명 규모인가?"}
    Q2 -->|아니오| PC["Postgres Changes<br/>(가장 간단)"]
    Q2 -->|예| BD["Broadcast from Database<br/>(트리거 + 브로드캐스트)"]

    Q3{"누가 접속해 있는지<br/>알아야 하나?"} --> P["Presence"]

    style B1 fill:#ccfbf1,stroke:#0d9488
    style PC fill:#fef3c7,stroke:#d97706
    style BD fill:#ccfbf1,stroke:#0d9488
    style P fill:#e9d5ff,stroke:#9333ea
```

<v-click>

**시작은 Postgres Changes로 해도 된다.** 가장 코드가 적다.
규모가 커지면 Broadcast from Database로 옮기는 것이 정석 경로다.

</v-click>

---

## 확장성 — 반드시 알아야 할 차이

<v-clicks>

**Postgres Changes의 동작 방식**

- 변경 하나가 발생하면 **구독자 각각에 대해 권한 검사를 수행**한다
- 구독자 100명이면 검사 100번. 1000명이면 1000번
- 처리량이 **쓰기 횟수가 아니라 구독자 수에 비례**해서 늘어난다
- 순서 보장을 위해 단일 스레드로 처리된다 → 컴퓨트를 키워도 크게 나아지지 않는다

**Broadcast의 동작 방식**

- 메시지 하나를 받아 **구독자 전체에 팬아웃**한다
- 권한 검사는 구독 시점에 한 번

</v-clicks>

<v-click>

공식 문서 기준: **같은 변경을 동시 구독하는 사용자가 약 3,000명을 넘으면 Broadcast로 전환**을 권장한다.

</v-click>

---

## private 채널과 인가

```ts
const channel = supabase.channel('room:42', { config: { private: true } })
```

```sql
-- realtime.messages 테이블에 RLS 정책을 건다
create policy "방 참여자만 구독 가능"
  on realtime.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.room_members
      where user_id = (select auth.uid())
        and 'room:' || room_id::text = realtime.topic()
    )
  );

-- 메시지 전송 권한은 insert 정책으로
create policy "방 참여자만 전송 가능"
  on realtime.messages for insert to authenticated
  with check ( /* 위와 동일한 조건 */ true );
```

<v-click>

`private: false`(기본)인 채널은 **채널 이름만 알면 누구나 구독**할 수 있다.
민감한 내용을 다루는 채널은 반드시 `private: true` + 정책을 건다.

</v-click>

---

## 실전 — 낙관적 UI와 재연결

```ts
// 1) 내가 보낸 메시지는 즉시 화면에 (서버 응답을 기다리지 않음)
function sendMessage(body: string) {
  const temp = { id: `temp-${crypto.randomUUID()}`, body, pending: true }
  setMessages(prev => [...prev, temp])

  supabase.from('messages').insert({ body }).select().single()
    .then(({ data, error }) => {
      if (error) return setMessages(prev => prev.filter(m => m.id !== temp.id))
      setMessages(prev => prev.map(m => (m.id === temp.id ? data : m)))
    })
}

// 2) 재연결 시 놓친 메시지 보충 — 구독만으로는 공백이 생긴다
channel.subscribe(async status => {
  if (status === 'SUBSCRIBED') {
    const { data } = await supabase
      .from('messages').select()
      .gt('created_at', lastSeenAt).order('created_at')
    mergeMessages(data ?? [])
  }
})
```

<v-click>

**실시간 구독은 "놓치지 않음"을 보장하지 않는다.** 연결이 끊긴 동안의 변경은 오지 않는다.
재연결 시 보충 조회를 반드시 넣자.

</v-click>

---

## Realtime 함정 모음

<v-clicks>

1. **publication에 테이블 추가를 안 함** — 이벤트가 하나도 안 온다
2. **`removeChannel` 누락** — 구독 누적, 메모리 누수, 중복 이벤트
3. **RLS 정책 없이 구독** — 조용히 아무것도 안 온다
4. **DELETE 이벤트에 필터를 걸려고 함** — 지원되지 않는다
5. **old record가 비어 있음** — `replica identity full` 미설정
6. **재연결 시 공백** — 보충 조회 로직 없음
7. **구독자 수천 명에 Postgres Changes** — 지연이 급증한다
8. **public 채널에 민감 정보 브로드캐스트** — 채널명만 알면 누구나 듣는다
9. **모든 변경을 통째로 구독** (`table` 미지정) — 불필요한 트래픽과 비용

</v-clicks>

---

## 9장 요약

<v-clicks>

- Broadcast(임의 메시지) · Presence(접속 상태) · Postgres Changes(DB 변경) 세 가지
- Postgres Changes는 **publication 등록 + RLS 정책**이 전제
- 확장성이 필요하면 **트리거 + `realtime.broadcast_changes()`** 로 전환한다
- 민감한 채널은 `private: true` + `realtime.messages` 정책
- 구독은 **유실 가능**하다 — 재연결 시 보충 조회를 항상 넣는다
- 채널 정리(`removeChannel`)를 잊지 않는다

</v-clicks>
