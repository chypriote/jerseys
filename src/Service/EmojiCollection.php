<?php

declare(strict_types=1);

namespace App\Service;

use IteratorAggregate;

/**
 * Collection of emojis used in demos.
 *
 * @implements IteratorAggregate<string>
 *
 * @internal
 */
final class EmojiCollection implements \IteratorAggregate, \Countable
{
    /** @var string[] */
    private array $emojis;

    /** @param  string[] $emojis */
    public function __construct(array $emojis = [])
    {
        $this->emojis = $emojis ?: $this->loadEmojis();
    }

    public function paginate(int $page, int $perPage): self
    {
        return new self(\array_slice($this->emojis, ($page - 1) * $perPage, $perPage));
    }

    public function getIterator(): \Traversable
    {
        return new \ArrayIterator($this->emojis);
    }

    public function count(): int
    {
        return \count($this->emojis);
    }

    private function loadEmojis(): array
    {
        return [
            '🐻',
            '🐨',
            '🐼',
            '🦥',
            '🦦',
            '🦨',
            '🦘',
            '🦡',
            '🐾',
            '🦃',
            '🐔',
            '🐓',
            '🐣',
            '🐤',
            '🐥',
            '🐦',
            '🐧',
            '🕊️',
            '🦅',
            '🦆',
            '🦢',
            '🦉',
            '🦤',
            '🪶',
            '🦩',
            '🦚',
            '🦜',
            '🪽',
            '🐦‍⬛',
            '🪿',
            '🐸',
            '🐊',
            '🐢',
            '🦎',
            '🐍',
            '🐲',
            '🐉',
            '🦕',
            '🦖',
            '🐳',
            '🐋',
            '🐬',
            '🦭',
            '🐟',
            '🐠',
            '🐡',
            '🦈',
            '🐙',
            '🐚',
            '🪸',
            '🪼',
            '🐌',
            '🦋',
            '🐛',
            '🐜',
            '🐝',
            '🪲',
            '🐞',
            '🦗',
            '🪳',
            '🕷️',
            '🕸️',
            '🦂',
            '🦟',
            '🪰',
            '🪱',
            '🦠',
            '💐',
            '🌸',
            '💮',
            '🪷',
            '🏵️',
            '🌹',
            '🥀',
            '🌺',
            '🌻',
            '🌼',
            '🌷',
            '🪻',
            '🌱',
            '🪴',
            '🌲',
            '🌳',
            '🌴',
            '🌵',
            '🌾',
            '🌿',
            '☘️',
            '🍀',
            '🍁',
            '🍂',
            '🍃',
            '🪹',
            '🪺',
            '🍄',
            '🍇',
            '🍈',
            '🍉',
            '🍊',
            '🍋',
            '🍌',
            '🍍',
            '🥭',
            '🍎',
            '🍏',
            '🍐',
            '🍑',
            '🍒',
            '🍓',
            '🫐',
            '🥝',
            '🍅',
            '🫒',
            '🥥',
            '🥑',
            '🍆',
            '🥔',
            '🥕',
            '🌽',
            '🌶️',
            '🫑',
            '🥒',
            '🥬',
            '🥦',
            '🧄',
            '🧅',
            '🍄',
            '🍠',
            '🥜',
            '🌰',
        ];
    }
}
