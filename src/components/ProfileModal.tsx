import React from 'react';
import { useQuery, gql, ApolloClient, InMemoryCache } from '@apollo/client';
import styles from './ProfileModal.module.css';

const client = new ApolloClient({
  uri: "http://localhost:8000/graphql",
  cache: new InMemoryCache(),
});

const GET_USER = gql`
  query GetUserById($id: Int!) {
    getUserById(id: $id) {
      id
      name
      email
      profilePic
    }
  }
`;

interface ProfileModalProps {
  userId: number;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ userId, onClose }) => {
  const { data, loading, error } = useQuery(GET_USER, {
    variables: { id: userId },
    client
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading user data</div>;

  const user = data?.getUserById;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()} 
      >
        <button className={styles.closeButton} onClick={onClose}>X</button>
        {user && (
          <div className={styles.profileContainer}>
            {user.profilePic ? (
              <img src={user.profilePic} alt={`${user.name}'s profile`} className={styles.profilePic} />
            ) : (
              <div className={styles.profilePicPlaceholder}>
                {user.name.charAt(0)}
              </div>
            )}
            <h3 className={styles.h3}>{user.name}</h3>
            <p className={styles.p}>{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
