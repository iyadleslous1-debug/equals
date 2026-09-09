import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabBar, type TabBarProps } from '../../components/TabBar';

function props(index: number): TabBarProps {
  const routes = [
    { key: 'discover', name: 'discover' },
    { key: 'chat', name: 'chat' },
  ];
  return {
    state: { index, routes },
    descriptors: {
      discover: { options: { title: 'Discover' } },
      chat: { options: { title: 'Messages' } },
    },
    navigation: { emit: () => ({ defaultPrevented: false }), navigate: jest.fn() },
  };
}

describe('TabBar (KIN)', () => {
  it('marks the active tab and navigates on press', async () => {
    const first = props(0);
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <TabBar {...first} />
      </SafeAreaProvider>,
    );
    expect(screen.getByTestId('tab-discover').props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(screen.getByTestId('tab-chat'));
    expect(first.navigation.navigate).toHaveBeenCalledWith('chat');
  });

  it('ignores presses on the focused tab', async () => {
    const first = props(1);
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <TabBar {...first} />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByTestId('tab-chat'));
    expect(first.navigation.navigate).not.toHaveBeenCalled();
  });
});
