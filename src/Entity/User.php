<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\UserRoles;
use App\Repository\UserRepository;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_USERNAME', fields: ['username'])]
#[UniqueEntity(fields: ['username'], message: 'There is already an account with this username')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private ?string $username = null;

    #[ORM\Column]
    private string $email;

    /** @var string[] $roles */
    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    private string $password;

    #[ORM\Column]
    private bool $isVerified = false;

    /** @var Collection<int, Jersey> */
    #[ORM\ManyToMany(targetEntity: Jersey::class, inversedBy: 'users')]
    protected Collection $wishlist;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function setUsername(string $username): static
    {
        $this->username = $username;

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->username;
    }

    /** @return string[] $roles */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = UserRoles::USER->value;
        $roles[] = UserRoles::ADMIN->value;

        return array_unique($roles);
    }

    /** @param string[] $roles */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function setEmail(string $email): void
    {
        $this->email = $email;
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
        // $this->plainPassword = null;
    }

    public function isVerified(): bool
    {
        return $this->isVerified;
    }

    public function setVerified(bool $isVerified): static
    {
        $this->isVerified = $isVerified;

        return $this;
    }

    /** @return Collection<int, Jersey> */
    public function getWishlist(): Collection
    {
        return $this->wishlist;
    }

    /** @param Collection<int, Jersey> */
    public function setWishlist(Collection $wishlist): void
    {
        $this->wishlist = $wishlist;
    }

    public function addToWishlist(Jersey $jersey): void
    {
        $this->wishlist->add($jersey);
    }

    public function removeFromWishlist(Jersey $jersey): void
    {
        $this->wishlist->removeElement($jersey);
    }
}
